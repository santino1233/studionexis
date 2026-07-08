import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SMS_MARKUP } from "@/lib/sms";

// Twilio status callback: updates delivery status and reconciles the
// estimated charge against Twilio's actual (marked-up) price.
export async function POST(req: Request) {
  if (new URL(req.url).searchParams.get("token") !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const sid = String(form.get("MessageSid") ?? "");
  const status = String(form.get("MessageStatus") ?? "").toUpperCase();
  const priceRaw = form.get("Price");

  const msg = await db.smsMessage.findUnique({ where: { sid } });
  if (!msg) return NextResponse.json({ ok: true });

  const data: { status?: string; finalCharge?: string } = {};
  if (["DELIVERED", "FAILED", "UNDELIVERED", "SENT"].includes(status)) data.status = status;

  if (priceRaw != null && msg.finalCharge == null) {
    const final = Math.round(Math.abs(Number(priceRaw)) * SMS_MARKUP * 10000) / 10000;
    if (Number.isFinite(final)) {
      data.finalCharge = final.toFixed(4);
      const diff = Number(msg.estCharge) - final; // refund if we over-estimated
      await db.$transaction([
        db.smsMessage.update({ where: { sid }, data }),
        db.tenant.update({ where: { id: msg.tenantId }, data: { smsBalance: { increment: diff } } }),
      ]);
      // Failed/undelivered messages get the whole charge back.
      if (status === "FAILED" || status === "UNDELIVERED") {
        await db.tenant.update({ where: { id: msg.tenantId }, data: { smsBalance: { increment: final } } });
      }
      return NextResponse.json({ ok: true });
    }
  }
  if (Object.keys(data).length) await db.smsMessage.update({ where: { sid }, data });
  return NextResponse.json({ ok: true });
}
