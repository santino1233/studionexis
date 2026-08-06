import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { checkBookingLimit, checkClientLimit } from "@/lib/plans";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_bookings");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  let clientId = String(form.get("clientId") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : `/schedule/${sessionId}`;

  // Quick-add: create the client on the spot (video spec X5)
  const quickName = String(form.get("quickName") ?? "").trim();
  if (!clientId && quickName) {
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
    const limit = await checkClientLimit(tenant);
    if (!limit.ok) return NextResponse.redirect(externalUrl(req, `${back}?error=limit`), 303);
    const created = await db.client.create({
      data: {
        tenantId: auth.tenantId,
        name: quickName,
        phone: String(form.get("quickPhone") ?? "").trim() || null,
        channel: "walk-in",
      },
    });
    clientId = created.id;
  }

  const tenantRow = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const limit = await checkBookingLimit(tenantRow);
  if (!limit.ok) return NextResponse.redirect(externalUrl(req, `${back}?error=limit`), 303);

  try {
    await db.$transaction(async (tx) => {
      const session = await tx.classSession.findFirstOrThrow({
        where: { id: sessionId, tenantId: auth.tenantId },
        include: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
      });
      const full = session.bookings.reduce((n, b) => n + b.qty, 0) >= session.capacity;

      // Prefer paying with an active package credit.
      const pkg = await tx.clientPackage.findFirst({
        where: { tenantId: auth.tenantId, clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
      });

      const usePkg = !full && !!pkg;
      if (usePkg) {
        await tx.clientPackage.update({ where: { id: pkg!.id }, data: { creditsLeft: { decrement: 1 } } });
      }
      await tx.booking.create({
        data: {
          tenantId: auth.tenantId,
          sessionId,
          clientId,
          status: full ? "WAITLIST" : "BOOKED",
          paymentMethod: full ? null : usePkg ? "package_credit" : "at_studio",
          clientPackageId: usePkg ? pkg!.id : null,
        },
      });
    });
  } catch {
    return NextResponse.redirect(externalUrl(req, `${back}?error=already`), 303);
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
