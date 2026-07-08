import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!client) return NextResponse.redirect(externalUrl(req, "/clients"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, `/clients/${id}/edit?error=name`), 303);

  await db.client.update({
    where: { id },
    data: {
      name,
      phone: String(form.get("phone") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim().toLowerCase() || null,
      channel: String(form.get("channel") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      medicalNotes: String(form.get("medicalNotes") ?? "").trim() || null,
    },
  });
  return NextResponse.redirect(externalUrl(req, `/clients/${id}`), 303);
}
