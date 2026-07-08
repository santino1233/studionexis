import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

// Platform owner confirms an SMS top-up was paid → credits the balance.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN") return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  await db.$transaction(async (tx) => {
    const topup = await tx.smsTopup.findFirst({ where: { id, status: "PENDING" } });
    if (!topup) return;
    await tx.smsTopup.update({ where: { id }, data: { status: "PAID" } });
    await tx.tenant.update({ where: { id: topup.tenantId }, data: { smsBalance: { increment: topup.amount } } });
  });
  return NextResponse.redirect(externalUrl(req, `/${process.env.HQ_PATH ?? "hq"}`), 303);
}
