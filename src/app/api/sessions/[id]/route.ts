import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { utcFromZoned } from "@/lib/tz";
import { computeSessionFinancials } from "@/lib/earnings";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const session = await db.classSession.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!session) return NextResponse.redirect(externalUrl(req, "/schedule"), 303);
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : null;

  if (action === "block" || action === "unblock" || action === "complete") {
    const status = action === "block" ? "BLOCKED" : action === "complete" ? "COMPLETED" : "SCHEDULED";
    if (action === "complete") {
      const fin = await computeSessionFinancials(id);
      await db.classSession.update({
        where: { id },
        data: { status, revenue: fin.revenue.toFixed(2), instructorEarnings: fin.earnings.toFixed(2) },
      });
    } else {
      await db.classSession.update({ where: { id }, data: { status } });
    }
    return NextResponse.redirect(externalUrl(req, back ?? `/schedule/${id}`), 303);
  }

  if (action === "checkin-all") {
    const bookings = await db.booking.findMany({ where: { sessionId: id, status: "BOOKED" }, select: { id: true, clientId: true } });
    await db.$transaction([
      db.booking.updateMany({ where: { sessionId: id, status: "BOOKED" }, data: { status: "CHECKED_IN" } }),
      ...bookings.map((b) => db.client.update({ where: { id: b.clientId }, data: { lastVisitAt: new Date() } })),
    ]);
    return NextResponse.redirect(externalUrl(req, back ?? `/schedule/${id}`), 303);
  }

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
      if (!ok) return NextResponse.redirect(externalUrl(req, back ?? `/schedule/${id}`), 303);
    }
    // Optional reschedule (date + time in studio tz) and duration change
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    let startsAt = session.startsAt;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
      startsAt = utcFromZoned(date, time, tenant.timezone);
    }
    const durMin = Number(form.get("durationMin"));
    const endsAt = Number.isFinite(durMin) && durMin >= 10
      ? new Date(startsAt.getTime() + durMin * 60_000)
      : new Date(startsAt.getTime() + (session.endsAt.getTime() - session.startsAt.getTime()));

    await db.classSession.update({
      where: { id },
      data: {
        capacity: Number.isFinite(capacity) && capacity >= 1 ? capacity : session.capacity,
        instructorId,
        location: String(form.get("location") ?? "").trim() || null,
        startsAt,
        endsAt,
        isPublic: form.get("isPublic") === "on",
        note: String(form.get("note") ?? "").trim() || null,
      },
    });
  }
  return NextResponse.redirect(externalUrl(req, back ?? `/schedule/${id}`), 303);
}
