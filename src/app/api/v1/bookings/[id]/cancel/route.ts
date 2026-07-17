import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { apiTenant, apiError } from "@/lib/api-auth";
import { promoteWaitlist } from "@/lib/bookings";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { id } = await params;
  const booking = await db.booking.findFirst({ where: { id, tenantId: a.tenant.id } });
  if (!booking) return apiError(404, "not_found", "No booking with that id.");
  if (!["BOOKED", "CHECKED_IN", "WAITLIST"].includes(booking.status)) {
    return apiError(409, "not_cancellable", `Booking is already ${booking.status.toLowerCase()}.`);
  }
  await db.$transaction(async (tx) => {
    const wasActive = booking.status === "BOOKED" || booking.status === "CHECKED_IN";
    await tx.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    if (wasActive && booking.clientPackageId) {
      await tx.clientPackage.update({ where: { id: booking.clientPackageId }, data: { creditsLeft: { increment: booking.qty } } });
    }
    if (wasActive) await promoteWaitlist(tx, a.tenant.id, booking.sessionId, booking.qty);
  });
  emitEvent(a.tenant.id, "booking.cancelled", { bookingId: id, clientName: "", className: "", source: "api" });
  return NextResponse.json({ id, status: "CANCELLED", creditsRefunded: booking.clientPackageId ? booking.qty : 0 });
}
