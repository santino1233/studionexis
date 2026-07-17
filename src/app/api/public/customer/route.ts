import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { createCustomerSession, destroyCustomerSession, getCustomerSession } from "@/lib/customer-auth";
import { externalUrl } from "@/lib/request-url";
import { promoteWaitlist } from "@/lib/bookings";

// One endpoint, three modes: login, register (set password), logout, cancel.
export async function POST(req: Request) {
  if (!rateLimit(req, "pubcust", 15, 60)) {
    return new NextResponse("Too many attempts — slow down and try again shortly.", { status: 429 });
  }
  const form = await req.formData();
  const mode = String(form.get("mode") ?? "");
  const slug = String(form.get("slug") ?? "");
  const me = `/book/${slug}/me`;

  if (mode === "logout") {
    await destroyCustomerSession();
    return NextResponse.redirect(externalUrl(req, `/book/${slug}`), 303);
  }

  if (mode === "cancel") {
    const session = await getCustomerSession();
    if (!session || session.slug !== slug) return NextResponse.redirect(externalUrl(req, me), 303);
    const bookingId = String(form.get("bookingId") ?? "");

    await db.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, tenantId: session.tenantId, clientId: session.clientId, status: { in: ["BOOKED", "WAITLIST"] } },
        include: { session: { include: { classType: true } }, tenant: true },
      });
      if (!booking) return;
      const pol = (booking.tenant.policies ?? {}) as { cancelWindowGroupHours?: number; cancelWindowPrivateHours?: number };
      const windowH = booking.session.classType.kind === "PRIVATE" ? pol.cancelWindowPrivateHours ?? 3 : pol.cancelWindowGroupHours ?? 3;
      const hoursOut = (booking.session.startsAt.getTime() - Date.now()) / 3600_000;
      if (hoursOut < windowH) return; // inside the window — portal refuses

      await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
      if (booking.status === "BOOKED" && booking.clientPackageId) {
        await tx.clientPackage.update({ where: { id: booking.clientPackageId }, data: { creditsLeft: { increment: booking.qty } } });
      }
      if (booking.status === "BOOKED") await promoteWaitlist(tx, booking.tenantId, booking.sessionId, booking.qty);
      emitEvent(booking.tenantId, "booking.cancelled", { bookingId: booking.id, clientName: "", className: booking.session.classType.name });
    });
    return NextResponse.redirect(externalUrl(req, me), 303);
  }

  if (mode === "profile") {
    const session = await getCustomerSession();
    if (!session || session.slug !== slug) return NextResponse.redirect(externalUrl(req, me), 303);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return NextResponse.redirect(externalUrl(req, `/book/${slug}/account?error=missing`), 303);
    await db.client.updateMany({
      where: { id: session.clientId, tenantId: session.tenantId },
      data: { name, phone: String(form.get("phone") ?? "").trim() || null },
    });
    return NextResponse.redirect(externalUrl(req, `/book/${slug}/account?ok=profile`), 303);
  }

  if (mode === "password") {
    const session = await getCustomerSession();
    if (!session || session.slug !== slug) return NextResponse.redirect(externalUrl(req, me), 303);
    const current = String(form.get("currentPassword") ?? "");
    const next = String(form.get("newPassword") ?? "");
    if (next.length < 6) return NextResponse.redirect(externalUrl(req, `${me}?error=missing`), 303);
    const c = await db.client.findFirst({ where: { id: session.clientId, tenantId: session.tenantId } });
    if (!c?.passwordHash || !(await bcrypt.compare(current, c.passwordHash))) {
      return NextResponse.redirect(externalUrl(req, `${me}?error=badpw`), 303);
    }
    await db.client.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    return NextResponse.redirect(externalUrl(req, `${me}?ok=pw`), 303);
  }

  if (mode === "onboard") {
    // Post-signup wizard steps (Wave 14 V5) — each optional.
    const t = await tenantBySlugOrDomain(slug);
    const session = await getCustomerSession();
    if (!t || !session || session.tenantId !== t.id) return NextResponse.redirect(externalUrl(req, me), 303);
    const step = String(form.get("step") ?? "");
    const next = String(form.get("next") ?? `/book/${slug}`);
    const safeNext = next.startsWith(`/book/${slug}`) ? next : `/book/${slug}`;
    const dob = String(form.get("dob") ?? "");
    const medical = String(form.get("medical") ?? "").trim().slice(0, 500);
    const heard = String(form.get("heard") ?? "").trim().slice(0, 30);
    await db.client.update({
      where: { id: session.clientId },
      data: {
        ...(step === "dob" && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? { birthday: new Date(`${dob}T00:00:00Z`) } : {}),
        ...(step === "medical" && medical ? { medicalNotes: medical } : {}),
        ...(step === "heard" && heard ? { channel: heard.toLowerCase() } : {}),
      },
    });
    return NextResponse.redirect(externalUrl(req, safeNext), 303);
  }

  // login / register
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!contact || password.length < 6) return NextResponse.redirect(externalUrl(req, `${me}?error=missing`), 303);

  const client = await db.client.findFirst({
    where: { tenantId: tenant.id, OR: [{ email: contact }, { phone: contact }] },
  });

  if (mode === "register") {
    if (client?.passwordHash) return NextResponse.redirect(externalUrl(req, `${me}?error=haspw`), 303);
    const hash = await bcrypt.hash(password, 10);
    const target = client
      ? await db.client.update({ where: { id: client.id }, data: { passwordHash: hash } })
      : await db.client.create({
          data: {
            tenantId: tenant.id,
            name: String(form.get("name") ?? "").trim() || contact,
            email: contact.includes("@") ? contact : null,
            phone: contact.includes("@") ? null : contact,
            channel: "website",
            passwordHash: hash,
          },
        });
    await createCustomerSession({ clientId: target.id, tenantId: tenant.id, slug });
    return NextResponse.redirect(externalUrl(req, `/book/${slug}/welcome`), 303);
  }

  // login
  if (!client?.passwordHash || !(await bcrypt.compare(password, client.passwordHash))) {
    return NextResponse.redirect(externalUrl(req, `${me}?error=bad`), 303);
  }
  await createCustomerSession({ clientId: client.id, tenantId: tenant.id, slug });
  return NextResponse.redirect(externalUrl(req, me), 303);
}
