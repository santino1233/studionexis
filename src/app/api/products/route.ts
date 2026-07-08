import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/products?error=prod"), 303);

  await db.product.create({
    data: {
      tenantId: auth.tenantId,
      name,
      price: String(Number(form.get("price") ?? 0) || 0),
      stock: Math.max(0, Number(form.get("stock") ?? 0) || 0),
    },
  });
  return NextResponse.redirect(externalUrl(req, "/products"), 303);
}
