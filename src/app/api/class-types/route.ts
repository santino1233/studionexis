import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { classFormats, isValidDifficulty } from "@/lib/class-config";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_class_types");
  if (__denied) return __denied;
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/class-types?error=name"), 303);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const format = String(form.get("format") ?? "");
  await db.classType.create({
    data: {
      tenantId: session.tenantId,
      name,
      color: String(form.get("color") ?? "#F97316"),
      kind: form.get("kind") === "PRIVATE" ? "PRIVATE" : "GROUP",
      format: format && classFormats(tenant).includes(format) ? format : null,
      description: String(form.get("description") ?? "").trim() || null,
      difficulty: isValidDifficulty(tenant, String(form.get("difficulty"))) ? String(form.get("difficulty")) : "ALL_LEVELS",
      durationMin: Math.max(10, Number(form.get("durationMin") ?? 60) || 60),
      capacity: Math.max(1, Number(form.get("capacity") ?? 10) || 10),
      price: String(Number(form.get("price") ?? 0) || 0),
    },
  });
  return NextResponse.redirect(externalUrl(req, "/class-types"), 303);
}
