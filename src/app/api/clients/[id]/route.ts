import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const __denied = await guardCap(req, "manage_clients");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!client) return NextResponse.redirect(externalUrl(req, "/clients"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, `/clients/${id}/edit?error=name`), 303);

  const tags = String(form.get("tags") ?? "")
    .split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
  const birthdayRaw = String(form.get("birthday") ?? "");
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? new Date(`${birthdayRaw}T12:00:00Z`) : null;
  await db.client.update({
    where: { id },
    data: {
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
  return NextResponse.redirect(externalUrl(req, `/clients/${id}`), 303);
}
