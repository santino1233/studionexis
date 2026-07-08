import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { checkStaffLimit } from "@/lib/plans";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = form.get("role") === "INSTRUCTOR" ? "INSTRUCTOR" : "STAFF";

  if (!name || !email || password.length < 8) {
    return NextResponse.redirect(externalUrl(req, "/team?error=missing"), 303);
  }
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const limit = await checkStaffLimit(tenant);
  if (!limit.ok) return NextResponse.redirect(externalUrl(req, "/team?error=limit"), 303);
  try {
    await db.user.create({
      data: { tenantId: auth.tenantId, name, email, role, passwordHash: await bcrypt.hash(password, 10) },
    });
  } catch {
    return NextResponse.redirect(externalUrl(req, "/team?error=exists"), 303);
  }
  return NextResponse.redirect(externalUrl(req, "/team"), 303);
}
