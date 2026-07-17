import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Studio-staff side of live chat (JSON, polled by the Inbox page).
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string };

export async function GET(req: Request) {
  const auth = await getSession();
  if (!auth || !auth.tenantId || auth.role === "INSTRUCTOR") return NextResponse.json({ error: "auth" }, { status: 401 });
  const url = new URL(req.url);
  const cid = url.searchParams.get("c");
  if (cid) {
    const c = await db.chatConversation.findFirst({ where: { id: cid, tenantId: auth.tenantId } });
    if (!c) return NextResponse.json({ error: "gone" }, { status: 404 });
    if (c.unreadStudio > 0) await db.chatConversation.update({ where: { id: c.id }, data: { unreadStudio: 0 } });
    return NextResponse.json({ id: c.id, name: c.name, contact: c.contact, clientId: c.clientId, status: c.status, messages: c.messages as Msg[] });
  }
  const list = await db.chatConversation.findMany({
    where: { tenantId: auth.tenantId, ...(url.searchParams.get("all") ? {} : { status: "OPEN" }) },
    orderBy: { lastMessageAt: "desc" }, take: 50,
  });
  return NextResponse.json({
    conversations: list.map((c) => {
      const msgs = c.messages as Msg[];
      return { id: c.id, name: c.name ?? "Visitor", contact: c.contact, status: c.status, unread: c.unreadStudio, last: msgs[msgs.length - 1]?.text ?? "", lastAt: c.lastMessageAt };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || !auth.tenantId || auth.role === "INSTRUCTOR") return NextResponse.json({ error: "auth" }, { status: 401 });
  let body: { id?: string; text?: string; close?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const c = await db.chatConversation.findFirst({ where: { id: String(body.id), tenantId: auth.tenantId } });
  if (!c) return NextResponse.json({ error: "gone" }, { status: 404 });
  if (body.close !== undefined) {
    await db.chatConversation.update({ where: { id: c.id }, data: { status: body.close ? "CLOSED" : "OPEN" } });
    return NextResponse.json({ ok: true });
  }
  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 422 });
  const msg: Msg = { from: "studio", name: auth.name, text, at: new Date().toISOString() };
  await db.chatConversation.update({
    where: { id: c.id },
    data: {
      messages: [...(c.messages as Msg[]), msg].slice(-200) as unknown as Prisma.InputJsonValue,
      unreadVisitor: { increment: 1 }, unreadStudio: 0, status: "OPEN", lastMessageAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
