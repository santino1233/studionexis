import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.redirect(externalUrl(req, "/clients/new?error=name"), 303);

  const client = await db.client.create({
    data: {
      tenantId: session.tenantId,
      name,
      phone: String(form.get("phone") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim().toLowerCase() || null,
      channel: String(form.get("channel") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      medicalNotes: String(form.get("medicalNotes") ?? "").trim() || null,
    },
  });
  return NextResponse.redirect(externalUrl(req, `/clients/${client.id}`), 303);
}
