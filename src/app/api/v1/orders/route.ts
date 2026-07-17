import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiTenant, pageParams } from "@/lib/api-auth";

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { url, limit, offset } = pageParams(req);
  const status = url.searchParams.get("status")?.toUpperCase();
  const where = { tenantId: a.tenant.id, ...(status && ["PAID", "PENDING", "REFUNDED", "VOID"].includes(status) ? { status: status as "PAID" } : {}) };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset, include: { client: { select: { name: true } }, items: true } }),
  ]);
  return NextResponse.json({
    total, limit, offset,
    data: orders.map((o) => ({
      id: o.id, number: o.number, total: Number(o.total), discount: Number(o.discount),
      method: o.method, status: o.status, client: o.client ? { id: o.clientId, name: o.client.name } : null,
      items: o.items.map((i) => ({ label: i.label, kind: i.kind, qty: i.qty, unitPrice: Number(i.unitPrice) })),
      createdAt: o.createdAt,
    })),
  });
}
