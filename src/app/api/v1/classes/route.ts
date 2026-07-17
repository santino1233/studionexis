import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant, pageParams } from "@/lib/api-auth";

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { url, limit, offset } = pageParams(req);
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date();
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date(Date.now() + 14 * 86400_000);
  const where = { tenantId: a.tenant.id, status: "SCHEDULED" as const, isPublic: true, startsAt: { gte: from, lt: to } };
  const [total, sessions] = await Promise.all([
    db.classSession.count({ where }),
    db.classSession.findMany({
      where, orderBy: { startsAt: "asc" }, take: limit, skip: offset,
      include: { classType: true, instructor: { select: { name: true } }, bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
    }),
  ]);
  return NextResponse.json({
    total, limit, offset,
    data: sessions.map((s) => ({
      id: s.id, name: s.classType.name, startsAt: s.startsAt, endsAt: s.endsAt,
      instructor: s.instructor?.name ?? null, location: s.location,
      capacity: s.capacity, spotsLeft: Math.max(0, s.capacity - s.bookings.reduce((n, b) => n + b.qty, 0)),
      price: Number(s.classType.price), difficulty: s.classType.difficulty, format: s.classType.format,
    })),
  });
}
