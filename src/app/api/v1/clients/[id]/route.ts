import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant, apiError } from "@/lib/api-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { id } = await params;
  const c = await db.client.findFirst({
    where: { id, tenantId: a.tenant.id },
    include: {
      packages: { where: { creditsLeft: { gt: 0 }, expiresAt: { gt: new Date() }, frozen: false }, include: { package: { select: { name: true, interval: true } } } },
      _count: { select: { bookings: true } },
    },
  });
  if (!c) return apiError(404, "not_found", "No client with that id.");
  return NextResponse.json({
    id: c.id, name: c.name, phone: c.phone, email: c.email, channel: c.channel, tags: c.tags,
    memberSince: c.memberSince, lastVisitAt: c.lastVisitAt, totalBookings: c._count.bookings,
    activePackages: c.packages.map((p) => ({ id: p.id, name: p.package.name, creditsLeft: p.creditsLeft, expiresAt: p.expiresAt, renews: p.package.interval !== "none" })),
  });
}
