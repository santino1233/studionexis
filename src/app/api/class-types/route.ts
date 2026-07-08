import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/class-types?error=name"), 303);

  await db.classType.create({
    data: {
      tenantId: session.tenantId,
      name,
      color: String(form.get("color") ?? "#F97316"),
      kind: form.get("kind") === "PRIVATE" ? "PRIVATE" : "GROUP",
      durationMin: Math.max(10, Number(form.get("durationMin") ?? 60) || 60),
      capacity: Math.max(1, Number(form.get("capacity") ?? 10) || 10),
      price: String(Number(form.get("price") ?? 0) || 0),
    },
  });
  return NextResponse.redirect(externalUrl(req, "/class-types"), 303);
}
