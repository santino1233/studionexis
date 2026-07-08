import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const user = await db.user.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!user || user.role === "OWNER") return NextResponse.redirect(externalUrl(req, "/team"), 303);

  if (action === "rate") {
    const rate = Number(form.get("rate"));
    if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
      await db.user.update({ where: { id }, data: { commissionRate: rate.toFixed(2) } });
    }
    return NextResponse.redirect(externalUrl(req, "/team"), 303);
  }
  if (action === "deactivate") await db.user.update({ where: { id }, data: { active: false } });
  if (action === "activate") await db.user.update({ where: { id }, data: { active: true } });
  return NextResponse.redirect(externalUrl(req, "/team"), 303);
}
