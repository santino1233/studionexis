import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// HQ side of studio<->Nexis support chats (channel "hq"). Superadmin only —
// must be called on the HQ host (cookies are host-scoped).
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string };

async function assertSuper() {
  const auth = await getSession();
  return auth && auth.role === "SUPERADMIN" ? auth : null;
}

export async function GET(req: Request) {
  if (!(await assertSuper())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("c");
  if (id) {
    const convo = await db.chatConversation.findFirst({ where: { id, channel: "hq" }, include: { tenant: { select: { name: true, slug: true, plan: true } } } });
    if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (convo.unreadStudio > 0) await db.chatConversation.update({ where: { id }, data: { unreadStudio: 0 } });
    return NextResponse.json({
      id: convo.id, studio: convo.tenant.name, slug: convo.tenant.slug, plan: convo.tenant.plan,
      contact: convo.contact, status: convo.status, messages: convo.messages as Msg[],
    });
  }
  const convos = await db.chatConversation.findMany({
    where: { channel: "hq" }, orderBy: { lastMessageAt: "desc" }, take: 100,
    include: { tenant: { select: { name: true, slug: true } } },
  });
  return NextResponse.json({
    conversations: convos.map((c) => {
      const msgs = c.messages as Msg[];
      return { id: c.id, studio: c.tenant.name, slug: c.tenant.slug, status: c.status, unread: c.unreadStudio, last: msgs[msgs.length - 1]?.text ?? "", lastAt: c.lastMessageAt };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await assertSuper();
  if (!auth) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string; text?: string; close?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const convo = await db.chatConversation.findFirst({ where: { id: String(body.id ?? ""), channel: "hq" } });
  if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.close !== undefined) {
    await db.chatConversation.update({ where: { id: convo.id }, data: { status: body.close ? "CLOSED" : "OPEN" } });
    return NextResponse.json({ ok: true });
  }
  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 422 });
  const msg: Msg = { from: "studio", name: "Nexis Support", text, at: new Date().toISOString() };
  await db.chatConversation.update({
    where: { id: convo.id },
    data: {
      messages: [...(convo.messages as unknown as Msg[]), msg].slice(-300) as unknown as Prisma.InputJsonValue,
      unreadVisitor: { increment: 1 }, status: "OPEN", lastMessageAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
