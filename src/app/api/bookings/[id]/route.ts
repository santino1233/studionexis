import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  const booking = await db.booking.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!booking) return NextResponse.redirect(externalUrl(req, "/bookings"), 303);
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : `/schedule/${booking.sessionId}`;

  if (action === "noshow") {
    await db.booking.update({ where: { id }, data: { status: "NO_SHOW" } });
  } else if (action === "checkin") {
    await db.$transaction([
      db.booking.update({ where: { id }, data: { status: "CHECKED_IN" } }),
      db.client.update({ where: { id: booking.clientId }, data: { lastVisitAt: new Date() } }),
    ]);
  } else if (action === "cancel") {
    await db.$transaction(async (tx) => {
      const wasActive = booking.status === "BOOKED" || booking.status === "CHECKED_IN";
      await tx.booking.update({ where: { id }, data: { status: "CANCELLED" } });
      // Simple policy for now: cancelling restores the credit. Per-method
      // late-cancel windows (forfeit) arrive with the policies iteration.
      if (wasActive && booking.clientPackageId) {
        await tx.clientPackage.update({ where: { id: booking.clientPackageId }, data: { creditsLeft: { increment: 1 } } });
      }
      // Promote the oldest waitlisted client into the freed spot.
      if (wasActive) {
        const next = await tx.booking.findFirst({
          where: { sessionId: booking.sessionId, status: "WAITLIST" },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          const pkg = await tx.clientPackage.findFirst({
            where: { tenantId: auth.tenantId, clientId: next.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: "asc" },
          });
          if (pkg) await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: 1 } } });
          await tx.booking.update({
            where: { id: next.id },
            data: { status: "BOOKED", paymentMethod: pkg ? "package_credit" : "at_studio", clientPackageId: pkg?.id ?? null },
          });
        }
      }
    });
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
