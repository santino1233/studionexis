import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return NextResponse.redirect(externalUrl(req, "/login?error=1"), 303);
  }

  const user = await db.user.findFirst({ where: { email, active: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.redirect(externalUrl(req, "/login?error=1"), 303);
  }

  if (user.role === "SUPERADMIN") {
    await createSession({ userId: user.id, tenantId: "", role: user.role, name: user.name });
    return NextResponse.redirect(externalUrl(req, `/${process.env.HQ_PATH ?? "hq"}`), 303);
  }
  if (!user.tenantId) return NextResponse.redirect(externalUrl(req, "/login?error=1"), 303);

  await createSession({ userId: user.id, tenantId: user.tenantId, role: user.role, name: user.name });
  return NextResponse.redirect(externalUrl(req, "/dashboard"), 303);
}
