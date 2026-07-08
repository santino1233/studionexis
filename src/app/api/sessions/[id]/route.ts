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
  const session = await db.classSession.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!session) return NextResponse.redirect(externalUrl(req, "/schedule"), 303);

  if (action === "cancel") {
    // Cancel the class: every active booking is cancelled and any package
    // credits used come back to the clients.
    await db.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { sessionId: id, status: { in: ["BOOKED", "CHECKED_IN", "WAITLIST"] } },
      });
      for (const b of bookings) {
        await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
        if ((b.status === "BOOKED" || b.status === "CHECKED_IN") && b.clientPackageId) {
          await tx.clientPackage.update({ where: { id: b.clientPackageId }, data: { creditsLeft: { increment: 1 } } });
        }
      }
      await tx.classSession.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    return NextResponse.redirect(externalUrl(req, "/schedule"), 303);
  }

  if (action === "update") {
    const capacity = Number(form.get("capacity") ?? session.capacity);
    const instructorId = String(form.get("instructorId") ?? "") || null;
    if (instructorId) {
      const ok = await db.user.findFirst({ where: { id: instructorId, tenantId: auth.tenantId } });
      if (!ok) return NextResponse.redirect(externalUrl(req, `/schedule/${id}`), 303);
    }
    await db.classSession.update({
      where: { id },
      data: {
        capacity: Number.isFinite(capacity) && capacity >= 1 ? capacity : session.capacity,
        instructorId,
        location: String(form.get("location") ?? "").trim() || null,
      },
    });
  }
  return NextResponse.redirect(externalUrl(req, `/schedule/${id}`), 303);
}
