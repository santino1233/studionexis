import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant, apiError, pageParams } from "@/lib/api-auth";
import { checkClientLimit } from "@/lib/plans";

const shape = (c: { id: string; name: string; phone: string | null; email: string | null; channel: string | null; tags: string[]; memberSince: Date; lastVisitAt: Date | null }) => ({
  id: c.id, name: c.name, phone: c.phone, email: c.email, channel: c.channel,
  tags: c.tags, memberSince: c.memberSince, lastVisitAt: c.lastVisitAt,
});

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { url, limit, offset } = pageParams(req);
  const q = url.searchParams.get("q")?.trim();
  const where = {
    tenantId: a.tenant.id,
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [total, clients] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset }),
  ]);
  return NextResponse.json({ total, limit, offset, data: clients.map(shape) });
}

export async function POST(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  let body: { name?: string; phone?: string; email?: string; tags?: string[]; notes?: string };
  try { body = await req.json(); } catch { return apiError(400, "bad_json", "Body must be JSON."); }
  const name = String(body.name ?? "").trim();
  if (!name) return apiError(422, "validation", "`name` is required.");
  const limitCheck = await checkClientLimit(a.tenant);
  if (limitCheck.ok !== true) return apiError(403, "plan_limit", "Client limit reached for this plan.");
  const client = await db.client.create({
    data: {
      tenantId: a.tenant.id, name,
      phone: String(body.phone ?? "").trim() || null,
      email: String(body.email ?? "").trim().toLowerCase() || null,
      tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [],
      notes: String(body.notes ?? "").trim() || null,
      channel: "api",
    },
  });
  return NextResponse.json(shape(client), { status: 201 });
}
