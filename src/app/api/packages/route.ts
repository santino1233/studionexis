import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/products?error=pkg"), 303);

  await db.package.create({
    data: {
      tenantId: auth.tenantId,
      name,
      credits: Math.max(1, Number(form.get("credits") ?? 10) || 10),
      validityDays: Math.max(1, Number(form.get("validityDays") ?? 90) || 90),
      price: String(Number(form.get("price") ?? 0) || 0),
      kind: form.get("kind") === "PRIVATE" ? "PRIVATE" : "GROUP",
      interval: ["month", "year"].includes(String(form.get("interval"))) ? String(form.get("interval")) : "none",
      shareable: form.get("shareable") !== "off",
    },
  });
  return NextResponse.redirect(externalUrl(req, "/products"), 303);
}
