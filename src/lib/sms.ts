import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";

// Pay-as-you-go SMS with a platform markup on carrier cost:
// $1.00 of Twilio usage costs the studio $1.10 of credits.
export const SMS_MARKUP = 1.1;
// Deducted at send time (per segment); reconciled against Twilio's real
// price when the status webhook arrives.
const EST_PRICE = Number(process.env.TWILIO_EST_PRICE ?? 0.0083);

// What a 1-segment message costs the studio (markup already inside —
// customers only ever see this as "the price").
export const SMS_RATE = EST_PRICE * SMS_MARKUP;
export const estMessages = (usd: number) => Math.floor(usd / SMS_RATE);

const r4 = (n: number) => Math.round(n * 10000) / 10000;
export const segmentsFor = (body: string) => Math.max(1, Math.ceil(body.length / 153));

export async function sendSms(opts: { tenantId: string; to: string; body: string; kind?: string }) {
  const { tenantId, to, body, kind = "notification" } = opts;
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  const record = (status: string, extra: { sid?: string; estCharge?: number } = {}) =>
    db.smsMessage.create({
      data: { tenantId, to, body, kind, status, sid: extra.sid, estCharge: (extra.estCharge ?? 0).toFixed(4) },
    });

  if (!getPlan(tenant.plan).sms) return record("SKIPPED_PLAN");
  if (Number(tenant.smsBalance) <= 0) return record("SKIPPED_NO_CREDITS");

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return record("SKIPPED_NO_TWILIO");

  const est = r4(segmentsFor(body) * EST_PRICE * SMS_MARKUP);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
        StatusCallback: `https://app.nexis.revsports.ca/api/twilio/status?token=${process.env.CRON_TOKEN}`,
      }),
    });
    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok || !data.sid) return record("FAILED");

    // Charge (estimated, marked up) atomically with the message record.
    const [msg] = await db.$transaction([
      db.smsMessage.create({
        data: { tenantId, to, body, kind, status: "SENT", sid: data.sid, estCharge: est.toFixed(4) },
      }),
      db.tenant.update({ where: { id: tenantId }, data: { smsBalance: { decrement: est } } }),
    ]);
    return msg;
  } catch {
    return record("FAILED");
  }
}
