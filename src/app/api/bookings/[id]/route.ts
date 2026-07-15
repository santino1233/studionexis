import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { promoteWaitlist } from "@/lib/bookings";

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
      // Simple policy for now: cancelling restores the credits (all seats).
      if (wasActive && booking.clientPackageId) {
        await tx.clientPackage.update({ where: { id: booking.clientPackageId }, data: { creditsLeft: { increment: booking.qty } } });
      }
      // Every freed seat can promote one waitlisted client.
      if (wasActive) await promoteWaitlist(tx, auth.tenantId, booking.sessionId, booking.qty);
    });
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
