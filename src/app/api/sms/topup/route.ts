import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

// Studio buys SMS credits: $10 / $50 / $100 packs or a custom amount.
// Creates a PENDING top-up; HQ marks it paid (Stripe attaches here later),
// which is when the balance is credited.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_billing");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const raw = String(form.get("amount") ?? "");
  const amount = Math.round(Number(raw) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 5 || amount > 1000) {
    return NextResponse.redirect(externalUrl(req, "/billing?sms=badamount"), 303);
  }
  await db.smsTopup.create({ data: { tenantId: auth.tenantId, amount: amount.toFixed(2) } });
  return NextResponse.redirect(externalUrl(req, "/billing?sms=reserved"), 303);
}
