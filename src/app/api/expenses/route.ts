import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const amount = Number(form.get("amount") ?? 0);
  const category = String(form.get("category") ?? "").trim() || "Other";
  const dateStr = String(form.get("date") ?? "");
  if (!(amount > 0)) return NextResponse.redirect(externalUrl(req, "/expenses?error=amount"), 303);

  await db.expense.create({
    data: {
      tenantId: auth.tenantId,
      category,
      amount: amount.toFixed(2),
      note: String(form.get("note") ?? "").trim() || null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T12:00:00Z`) : new Date(),
    },
  });
  return NextResponse.redirect(externalUrl(req, "/expenses"), 303);
}
