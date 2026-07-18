import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { checkBookingLimit, checkClientLimit } from "@/lib/plans";
import { externalUrl } from "@/lib/request-url";
import { sendEmail } from "@/lib/mailer";
import { sendSms } from "@/lib/sms";
import { timeInTz } from "@/lib/tz";
import { studioStripe, toStripeAmount } from "@/lib/stripe";
import { publicSiteUrl } from "@/lib/site-url";

export async function POST(req: Request) {
  if (!rateLimit(req, "pubbook", 15, 60)) {
    return new NextResponse("Too many attempts — slow down and try again shortly.", { status: 429 });
  }
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const sessionId = String(form.get("sessionId") ?? "");
  const customer = await getCustomerSession();
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const qty = Math.min(5, Math.max(1, Number(form.get("qty")) || 1));
  const pay = String(form.get("pay") ?? ""); // "" = legacy quick-book (auto), credit, at_studio, deposit, online
  // Errors return to the page the form lives on; success lands on the schedule.
  const fromRaw = String(form.get("from") ?? "");
  const errBack = fromRaw.startsWith(`/book/${slug}`) && !fromRaw.startsWith("//") ? fromRaw : `/book/${slug}`;
  const back = `/book/${slug}`;
  const fail = (code: string) =>
    NextResponse.redirect(externalUrl(req, `${errBack}?err=${code}&s=${sessionId}`), 303);

  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const payAtStudioOk = ((tenant.policies ?? {}) as { payAtStudio?: boolean }).payAtStudio !== false;

  const isMember = customer && customer.tenantId === tenant.id;
  if (!isMember && (!name || (!phone && !email))) return fail("missing");
  if (pay === "deposit") return fail("online"); // stub — activates later
  if (pay === "online") {
    // Pay the drop-in online through the studio's Stripe (members only —
    // the booking is created when the payment confirms).
    const stripe = studioStripe(tenant);
    if (!stripe) return fail("online");
    if (!isMember) return fail("online-login");
    const session = await db.classSession.findFirst({
      where: { id: sessionId, tenantId: tenant.id, status: "SCHEDULED", isPublic: true, startsAt: { gt: new Date() } },
      include: { classType: true, bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
    });
    if (!session) return fail("failed");
    const spotsLeft = session.capacity - session.bookings.reduce((n, b) => n + b.qty, 0);
    if (qty > spotsLeft) return fail("spots");
    try {
      const origin = externalUrl(req, "").toString().replace(/\/$/, "");
      const co = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: qty,
          price_data: {
            currency: tenant.currency.toLowerCase(),
            unit_amount: toStripeAmount(Number(session.classType.price), tenant.currency),
            product_data: { name: `${session.classType.name} — ${tenant.name}` },
          },
        }],
        metadata: { kind: "class", tenantId: tenant.id, sessionId, clientId: customer!.clientId, qty: String(qty) },
        success_url: `${origin}/api/public/stripe/class-confirm?slug=${encodeURIComponent(slug)}&sid={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/book/${slug}/class/${sessionId}?err=cancelled`,
      });
      return NextResponse.redirect(co.url!, 303);
    } catch {
      return fail("failed");
    }
  }
  if (pay === "credit" && !isMember) return fail("credits");
  if (pay === "at_studio" && !payAtStudioOk) return fail("pay");

  const bookingLimit = await checkBookingLimit(tenant);
  if (!bookingLimit.ok) return NextResponse.redirect(externalUrl(req, `${errBack}?err=full`), 303);

  try {
    const result = await db.$transaction(async (tx) => {
      const session = await tx.classSession.findFirstOrThrow({
        where: { id: sessionId, tenantId: tenant.id, status: "SCHEDULED", isPublic: true, startsAt: { gt: new Date() } },
        include: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
      });

      // Logged-in members book as themselves; guests match by contact.
      let client = isMember
        ? await tx.client.findFirst({ where: { id: customer!.clientId, tenantId: tenant.id } })
        : await tx.client.findFirst({
            where: {
              tenantId: tenant.id,
              OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
            },
          });
      if (!client) {
        const clientLimit = await checkClientLimit(tenant);
        if (clientLimit.ok !== true) throw new Error("studio-full");
        client = await tx.client.create({
          data: { tenantId: tenant.id, name, phone: phone || null, email: email || null, channel: "website" },
        });
        emitEvent(tenant.id, "client.created", { id: client.id, name: client.name, source: "website" });
      }

      const taken = session.bookings.reduce((n, b) => n + b.qty, 0);
      const spotsLeft = session.capacity - taken;
      const full = spotsLeft <= 0;
      if (!full && qty > spotsLeft) throw new Error("spots"); // room, but not for the whole party

      // Settle payment: explicit choice from the class page, or the legacy
      // quick-book auto pick (credit if they have one, else pay at studio).
      let usePkgId: string | null = null;
      let method: string | null = null;
      if (!full) {
        if (pay === "credit" || pay === "") {
          const pkg = await tx.clientPackage.findFirst({
            where: { tenantId: tenant.id, clientId: client.id, creditsLeft: { gte: qty }, frozen: false, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: "asc" },
          });
          if (pkg) {
            await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: qty } } });
            usePkgId = pkg.id;
            method = "package_credit";
          } else if (pay === "credit") {
            throw new Error("credits");
          }
        }
        if (!method) {
          if (!payAtStudioOk) throw new Error("pay");
          method = "at_studio";
        }
      }

      const created = await tx.booking.create({
        data: {
          tenantId: tenant.id,
          sessionId,
          clientId: client.id,
          qty: full ? 1 : qty, // waitlist holds one place
          status: full ? "WAITLIST" : "BOOKED",
          paymentMethod: method,
          clientPackageId: usePkgId,
        },
      });
      return { outcome: full ? "waitlist" : "booked", client, session, bookingId: created.id };
    });

    if (!result.client.email && result.client.phone) {
      const s = result.session;
      const cls = await db.classType.findUnique({ where: { id: s.classTypeId } });
      await sendSms({
        tenantId: tenant.id,
        to: result.client.phone,
        kind: "confirmation",
        body: `${tenant.name}: ${result.outcome === "booked" ? "You're booked for" : "You're waitlisted for"} ${cls?.name ?? "class"} ${s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} ${timeInTz(s.startsAt, tenant.timezone)}. See you there!`,
      });
    } else if (result.client.email) {
      const s = result.session;
      const cls = await db.classType.findUnique({ where: { id: s.classTypeId } });
      await sendEmail({
        tenantId: tenant.id,
        to: result.client.email,
        subject: `${result.outcome === "booked" ? "Booking confirmed" : "You're on the waitlist"} — ${cls?.name ?? "class"} at ${tenant.name}`,
        body: `Hi ${result.client.name},\n\n${result.outcome === "booked" ? "You're booked for" : "You're waitlisted for"} ${cls?.name ?? "class"} on ${s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "long", month: "long", day: "numeric" })} at ${timeInTz(s.startsAt, tenant.timezone)}.\n\nManage your bookings: ${publicSiteUrl(tenant, "/bookings")}\n\n${tenant.name}`,
      });
    }
    emitEvent(tenant.id, "booking.created", {
      bookingId: result.bookingId, clientName: result.client.name, className: (await db.classType.findUnique({ where: { id: result.session.classTypeId } }))?.name ?? "class",
      startsAt: result.session.startsAt.toISOString(), seats: qty, status: result.outcome,
    });
    const d = new Date();
    const ref = `NX-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${result.bookingId.slice(-4).toUpperCase()}`;
    return NextResponse.redirect(externalUrl(req, `${back}?ok=${result.outcome}&ref=${ref}&cls=${encodeURIComponent(result.session.id)}`), 303);
  } catch (e) {
    const known = ["spots", "credits", "pay"].find((k) => e instanceof Error && e.message === k);
    const dup = e instanceof Error && e.message.includes("Unique constraint");
    const full = e instanceof Error && e.message === "studio-full";
    return fail(known ?? (dup ? "already" : full ? "full" : "failed"));
  }
}
