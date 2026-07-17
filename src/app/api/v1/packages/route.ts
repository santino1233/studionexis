import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant } from "@/lib/api-auth";

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const packages = await db.package.findMany({ where: { tenantId: a.tenant.id, active: true }, orderBy: { price: "asc" } });
  return NextResponse.json({
    data: packages.map((p) => ({
      id: p.id, name: p.name, credits: p.credits, price: Number(p.price),
      kind: p.kind, billing: p.interval === "none" ? "one_time" : `${p.interval}ly`, validityDays: p.validityDays,
    })),
  });
}
