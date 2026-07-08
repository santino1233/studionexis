import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { checkClientLimit } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/clients/new?error=name"), 303);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const limit = await checkClientLimit(tenant);
  if (!limit.ok) return NextResponse.redirect(externalUrl(req, "/clients/new?error=limit"), 303);

  const tags = String(form.get("tags") ?? "")
    .split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
  const birthdayRaw = String(form.get("birthday") ?? "");
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? new Date(`${birthdayRaw}T12:00:00Z`) : null;
  const client = await db.client.create({
    data: {
      tenantId: session.tenantId,
      name,
      phone: String(form.get("phone") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim().toLowerCase() || null,
      channel: String(form.get("channel") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      medicalNotes: String(form.get("medicalNotes") ?? "").trim() || null,
      tags,
      birthday,
    },
  });
  return NextResponse.redirect(externalUrl(req, `/clients/${client.id}`), 303);
}
