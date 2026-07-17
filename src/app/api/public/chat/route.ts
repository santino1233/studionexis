import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { emitEvent, appsOf } from "@/lib/webhooks";

// Visitor side of live chat (Tidio-style widget).
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string; image?: string };
const cleanImage = (v: unknown) => (typeof v === "string" && v.startsWith("/api/media/") ? v.slice(0, 300) : undefined);

function visitorIdFrom(req: Request): { id: string; fresh: boolean } {
  const cookies = Object.fromEntries((req.headers.get("cookie") ?? "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p.length === 2));
  if (/^[a-f0-9-]{36}$/.test(cookies.nx_vid ?? "")) return { id: cookies.nx_vid, fresh: false };
  return { id: randomUUID(), fresh: true };
}

function withCookie(res: NextResponse, id: string, fresh: boolean) {
  if (fresh) res.headers.append("Set-Cookie", `nx_vid=${id}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = await tenantBySlugOrDomain(url.searchParams.get("slug") ?? "");
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (appsOf(tenant.policies).chatDisabled) return NextResponse.json({ disabled: true });
  const { id: visitorId, fresh } = visitorIdFrom(req);
  const convo = await db.chatConversation.findFirst({ where: { tenantId: tenant.id, visitorId }, orderBy: { lastMessageAt: "desc" } });
  if (convo && convo.unreadVisitor > 0 && url.searchParams.get("read") === "1") {
    await db.chatConversation.update({ where: { id: convo.id }, data: { unreadVisitor: 0 } });
  }
  return withCookie(NextResponse.json({
    messages: (convo?.messages as Msg[] | undefined) ?? [],
    unread: convo?.unreadVisitor ?? 0,
    status: convo?.status ?? null,
    studio: tenant.name,
  }), visitorId, fresh);
}

export async function POST(req: Request) {
  if (!rateLimit(req, "chat", 30, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let body: { slug?: string; text?: string; name?: string; contact?: string; image?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const tenant = await tenantBySlugOrDomain(String(body.slug ?? ""));
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (appsOf(tenant.policies).chatDisabled) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const text = String(body.text ?? "").trim().slice(0, 2000);
  const image = cleanImage(body.image);
  if (!text && !image) return NextResponse.json({ error: "empty" }, { status: 422 });

  const { id: visitorId, fresh } = visitorIdFrom(req);
  const customer = await getCustomerSession();
  const client = customer && customer.tenantId === tenant.id
    ? await db.client.findFirst({ where: { id: customer.clientId, tenantId: tenant.id } })
    : null;
  const name = client?.name || String(body.name ?? "").trim().slice(0, 60) || "Visitor";

  let convo = await db.chatConversation.findFirst({ where: { tenantId: tenant.id, visitorId }, orderBy: { lastMessageAt: "desc" } });
  const msg: Msg = { from: "visitor", name, text, at: new Date().toISOString(), ...(image ? { image } : {}) };
  if (!convo) {
    convo = await db.chatConversation.create({
      data: {
        tenantId: tenant.id, visitorId, clientId: client?.id ?? null, name,
        contact: client?.email ?? client?.phone ?? (String(body.contact ?? "").trim().slice(0, 80) || null),
        messages: [msg] as unknown as Prisma.InputJsonValue, unreadStudio: 1,
      },
    });
  } else {
    await db.chatConversation.update({
      where: { id: convo.id },
      data: {
        messages: [...(convo.messages as unknown as Msg[]), msg].slice(-200) as unknown as Prisma.InputJsonValue,
        unreadStudio: { increment: 1 }, status: "OPEN", lastMessageAt: new Date(),
        ...(client && !convo.clientId ? { clientId: client.id, name: client.name } : {}),
        ...(body.contact && !convo.contact ? { contact: String(body.contact).trim().slice(0, 80) } : {}),
      },
    });
  }
  emitEvent(tenant.id, "chat.message", { clientName: name, className: "", text: text.slice(0, 120) || "📷 Photo" });
  return withCookie(NextResponse.json({ ok: true }), visitorId, fresh);
}
