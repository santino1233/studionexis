import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant, apiError } from "@/lib/api-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { id } = await params;
  const s = await db.classSession.findFirst({
    where: { id, tenantId: a.tenant.id },
    include: { classType: true, instructor: { select: { name: true } }, bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
  });
  if (!s) return apiError(404, "not_found", "No class with that id.");
  return NextResponse.json({
    id: s.id, name: s.classType.name, description: s.classType.description, startsAt: s.startsAt, endsAt: s.endsAt,
    instructor: s.instructor?.name ?? null, location: s.location, status: s.status,
    capacity: s.capacity, spotsLeft: Math.max(0, s.capacity - s.bookings.reduce((n, b) => n + b.qty, 0)),
    price: Number(s.classType.price), difficulty: s.classType.difficulty, format: s.classType.format,
    benefits: s.classType.benefits, equipment: s.classType.equipment,
  });
}
