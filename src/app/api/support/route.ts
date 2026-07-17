import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

// Studio side of the Support Center (Wave 16 B3).
export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || !auth.tenantId) return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const form = await req.formData();
  const mode = String(form.get("mode") ?? "new");

  if (mode === "reply") {
    const id = String(form.get("id") ?? "");
    const text = String(form.get("text") ?? "").trim().slice(0, 4000);
    const t = await db.supportTicket.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (t && text) {
      const messages = [...(t.messages as unknown[]), { from: "studio", name: auth.name, text, at: new Date().toISOString() }];
      await db.supportTicket.update({ where: { id }, data: { messages: messages as Prisma.InputJsonValue, status: t.status === "RESOLVED" ? "OPEN" : "WAITING" } });
    }
    return NextResponse.redirect(externalUrl(req, `/support?t=${id}`), 303);
  }

  const subject = String(form.get("subject") ?? "").trim().slice(0, 150);
  const text = String(form.get("text") ?? "").trim().slice(0, 4000);
  const kind = form.get("kind") === "bug" ? "bug" : "support";
  if (!subject || !text) return NextResponse.redirect(externalUrl(req, "/support?error=1"), 303);
  const ticket = await db.supportTicket.create({
    data: {
      tenantId: auth.tenantId, kind, subject,
      priority: kind === "bug" ? "HIGH" : "MEDIUM",
      context: {
        url: String(form.get("ctx_url") ?? ""),
        userAgent: req.headers.get("user-agent") ?? "",
        screen: String(form.get("ctx_screen") ?? ""),
        user: auth.name, role: auth.role,
      } as Prisma.InputJsonValue,
      messages: [{ from: "studio", name: auth.name, text, at: new Date().toISOString() }] as Prisma.InputJsonValue,
    },
  });
  return NextResponse.redirect(externalUrl(req, `/support?t=${ticket.id}&ok=1`), 303);
}
