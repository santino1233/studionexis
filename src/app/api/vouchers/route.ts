import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const value = Number(form.get("value") ?? 0);
  const type = form.get("type") === "FIXED" ? "FIXED" : "PERCENT";
  if (!code || !(value > 0) || (type === "PERCENT" && value > 100)) {
    return NextResponse.redirect(externalUrl(req, "/products?error=voucher"), 303);
  }
  const expiresRaw = String(form.get("expiresAt") ?? "");
  try {
    await db.voucher.create({
      data: {
        tenantId: auth.tenantId,
        code,
        type,
        value: value.toFixed(2),
        maxUses: Math.max(1, Number(form.get("maxUses") ?? 100) || 100),
        expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) ? new Date(`${expiresRaw}T23:59:59Z`) : null,
      },
    });
  } catch {
    return NextResponse.redirect(externalUrl(req, "/products?error=voucherdup"), 303);
  }
  return NextResponse.redirect(externalUrl(req, "/products"), 303);
}
