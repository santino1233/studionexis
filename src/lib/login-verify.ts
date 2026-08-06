import { createHash } from "crypto";
import type { Tenant, User } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";
import { sendSms } from "@/lib/sms";
import { buildEmail } from "@/lib/email-templates";

// Login verification (2FA). Safe by design: it only ever engages when the
// studio has it enabled AND a delivery channel is actually configured for the
// signing-in user — otherwise login stays password-only (nobody is locked out).
export const CODE_TTL_MIN = 10;

export type Channel = "email" | "sms";
export type SecurityPolicy = { loginVerification?: "off" | "email" | "sms" | "any" };

export function securityOf(tenant: Pick<Tenant, "policies">): SecurityPolicy {
  return (((tenant.policies ?? {}) as { security?: SecurityPolicy }).security) ?? {};
}

const smtpLive = () => !!process.env.SMTP_HOST;
const twilioLive = () => !!process.env.TWILIO_ACCOUNT_SID;

// The channel we can actually deliver on for this user, honouring the studio's
// preference. Returns null when nothing is deliverable (→ password-only).
export function liveChannelFor(tenant: Pick<Tenant, "policies">, user: Pick<User, "email" | "phone">): { channel: Channel; contact: string } | null {
  const pref = securityOf(tenant).loginVerification ?? "any";
  if (pref === "off") return null;
  const canEmail = smtpLive() && !!user.email;
  const canSms = twilioLive() && !!user.phone;
  if (pref === "email") return canEmail ? { channel: "email", contact: user.email! } : null;
  if (pref === "sms") return canSms ? { channel: "sms", contact: user.phone! } : null;
  // "any": prefer email, fall back to SMS
  if (canEmail) return { channel: "email", contact: user.email! };
  if (canSms) return { channel: "sms", contact: user.phone! };
  return null;
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
export function hashCode(code: string): string {
  return createHash("sha256").update(`${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");
}

export async function sendLoginCode(tenant: Tenant, user: Pick<User, "name">, channel: Channel, contact: string, code: string) {
  if (channel === "email") {
    const mail = buildEmail(tenant, "loginCode", { studio: tenant.name, name: user.name, code, minutes: CODE_TTL_MIN });
    await sendEmail({ tenantId: tenant.id, to: contact, subject: mail.subject, body: mail.body, html: mail.html });
  } else {
    await sendSms({ tenantId: tenant.id, to: contact, kind: "verification", body: `${tenant.name}: your verification code is ${code}. Expires in ${CODE_TTL_MIN} min.` });
  }
}
