import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : "/team";
  const profile = `/team/${id}`;
  const user = await db.user.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!user) return NextResponse.redirect(externalUrl(req, "/team"), 303);

  if (action === "profile") {
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!name || !email) return NextResponse.redirect(externalUrl(req, `${profile}?error=fields`), 303);
    const clash = await db.user.findFirst({ where: { tenantId: auth.tenantId, email, NOT: { id } } });
    if (clash) return NextResponse.redirect(externalUrl(req, `${profile}?error=exists`), 303);
    const role = String(form.get("role") ?? "");
    await db.user.update({
      where: { id },
      data: {
        name,
        email,
        phone: String(form.get("phone") ?? "").trim() || null,
        // The owner account keeps its role; others can switch staff/instructor.
        ...(user.role !== "OWNER" && ["STAFF", "INSTRUCTOR"].includes(role) ? { role: role as "STAFF" | "INSTRUCTOR" } : {}),
      },
    });
    return NextResponse.redirect(externalUrl(req, `${profile}?saved=1`), 303);
  }

  if (action === "pay") {
    const num = (k: string) => {
      const v = Number(form.get(k));
      return Number.isFinite(v) && v >= 0 ? v : 0;
    };
    await db.user.update({ where: { id }, data: { baseSalary: num("baseSalary").toFixed(2), hourlyRate: num("hourlyRate").toFixed(2) } });
    return NextResponse.redirect(externalUrl(req, `${profile}?saved=1`), 303);
  }

  if (action === "password") {
    const pw = String(form.get("password") ?? "");
    if (pw.length < 8) return NextResponse.redirect(externalUrl(req, `${profile}?error=password`), 303);
    await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
    return NextResponse.redirect(externalUrl(req, `${profile}?saved=1`), 303);
  }

  if (action === "rate") {
    const rate = Number(form.get("rate"));
    if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
      await db.user.update({ where: { id }, data: { commissionRate: rate.toFixed(2) } });
    }
    return NextResponse.redirect(externalUrl(req, back), 303);
  }

  if (user.role === "OWNER") return NextResponse.redirect(externalUrl(req, back), 303);
  if (action === "deactivate") await db.user.update({ where: { id }, data: { active: false } });
  if (action === "activate") await db.user.update({ where: { id }, data: { active: true } });
  return NextResponse.redirect(externalUrl(req, back), 303);
}
