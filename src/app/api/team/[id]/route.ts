import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const action = String((await req.formData()).get("action") ?? "");
  const user = await db.user.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!user || user.role === "OWNER") return NextResponse.redirect(externalUrl(req, "/team"), 303);

  if (action === "deactivate") await db.user.update({ where: { id }, data: { active: false } });
  if (action === "activate") await db.user.update({ where: { id }, data: { active: true } });
  return NextResponse.redirect(externalUrl(req, "/team"), 303);
}
