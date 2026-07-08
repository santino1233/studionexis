import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN") return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  const action = String((await req.formData()).get("action") ?? "");
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "extend") {
    const from = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    await db.tenant.update({ where: { id }, data: { status: "TRIAL", trialEndsAt: new Date(from.getTime() + 7 * 86400_000) } });
  } else if (action === "activate") {
    await db.tenant.update({ where: { id }, data: { status: "ACTIVE", trialEndsAt: null } });
  } else if (action === "suspend") {
    await db.tenant.update({ where: { id }, data: { status: "SUSPENDED" } });
  } else if (action === "reactivate") {
    await db.tenant.update({ where: { id }, data: { status: tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? "TRIAL" : "ACTIVE" } });
  }
  return NextResponse.redirect(externalUrl(req, `/${process.env.HQ_PATH ?? "hq"}`), 303);
}
