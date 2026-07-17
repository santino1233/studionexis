import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

// Studio side of the live chat with Studio Nexis support (channel "hq").
// One conversation per studio; "visitor" = studio staff, "studio" = Nexis HQ.
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string; image?: string };
const cleanImage = (v: unknown) => (typeof v === "string" && v.startsWith("/api/media/") ? v.slice(0, 300) : undefined);

export async function GET(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenant = await getCurrentTenant();
  const convo = await db.chatConversation.findFirst({ where: { tenantId: tenant.id, channel: "hq" } });
  if (convo && convo.unreadVisitor > 0 && new URL(req.url).searchParams.get("read") === "1") {
    await db.chatConversation.update({ where: { id: convo.id }, data: { unreadVisitor: 0 } });
  }
  return NextResponse.json({
    messages: (convo?.messages as Msg[] | undefined) ?? [],
    unread: convo?.unreadVisitor ?? 0,
  });
}

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenant = await getCurrentTenant();
  let body: { text?: string; image?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const text = String(body.text ?? "").trim().slice(0, 2000);
  const image = cleanImage(body.image);
  if (!text && !image) return NextResponse.json({ error: "empty" }, { status: 422 });

  const msg: Msg = { from: "visitor", name: auth.name || "Studio", text, at: new Date().toISOString(), ...(image ? { image } : {}) };
  const convo = await db.chatConversation.findFirst({ where: { tenantId: tenant.id, channel: "hq" } });
  if (!convo) {
    await db.chatConversation.create({
      data: {
        tenantId: tenant.id, visitorId: "hq", channel: "hq", name: tenant.name,
        contact: null, messages: [msg] as unknown as Prisma.InputJsonValue, unreadStudio: 1,
      },
    });
  } else {
    await db.chatConversation.update({
      where: { id: convo.id },
      data: {
        messages: [...(convo.messages as unknown as Msg[]), msg].slice(-300) as unknown as Prisma.InputJsonValue,
        unreadStudio: { increment: 1 }, status: "OPEN", lastMessageAt: new Date(),
      },
    });
  }
  return NextResponse.json({ ok: true });
}
