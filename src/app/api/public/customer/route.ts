import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { createCustomerSession, destroyCustomerSession, getCustomerSession } from "@/lib/customer-auth";
import { externalUrl } from "@/lib/request-url";

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
        await tx.clientPackage.update({ where: { id: booking.clientPackageId }, data: { creditsLeft: { increment: 1 } } });
      }
      if (booking.status === "BOOKED") {
        const next = await tx.booking.findFirst({ where: { sessionId: booking.sessionId, status: "WAITLIST" }, orderBy: { createdAt: "asc" } });
        if (next) {
          const pkg = await tx.clientPackage.findFirst({
            where: { tenantId: booking.tenantId, clientId: next.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: "asc" },
          });
          if (pkg) await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: 1 } } });
          await tx.booking.update({ where: { id: next.id }, data: { status: "BOOKED", paymentMethod: pkg ? "package_credit" : "at_studio", clientPackageId: pkg?.id ?? null } });
        }
      }
    });
    return NextResponse.redirect(externalUrl(req, me), 303);
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
    return NextResponse.redirect(externalUrl(req, me), 303);
  }

  // login
  if (!client?.passwordHash || !(await bcrypt.compare(password, client.passwordHash))) {
    return NextResponse.redirect(externalUrl(req, `${me}?error=bad`), 303);
  }
  await createCustomerSession({ clientId: client.id, tenantId: tenant.id, slug });
  return NextResponse.redirect(externalUrl(req, me), 303);
}
