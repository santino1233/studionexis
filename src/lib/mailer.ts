import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { BASE_DOMAIN } from "@/lib/config";

// SMTP is optional. Without SMTP_HOST every send is recorded in EmailLog
// as "skipped" so the product behaves identically and flipping on real
// email later is just env vars + restart.
function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

// `html` is optional: when a send path provides a branded HTML version (see
// lib/email-templates.buildEmail) it is delivered as the rich part with `body`
// as the plain-text fallback. EmailLog only ever stores the plain-text `body`.
export async function sendEmail(opts: { tenantId: string; to: string; subject: string; body: string; html?: string }) {
  const t = transport();
  let status = "skipped";
  if (t) {
    try {
      await t.sendMail({
        from: process.env.SMTP_FROM ?? `no-reply@${BASE_DOMAIN}`,
        to: opts.to,
        subject: opts.subject,
        text: opts.body,
        ...(opts.html ? { html: opts.html } : {}),
      });
      status = "sent";
    } catch {
      status = "failed";
    }
  }
  await db.emailLog.create({
    data: { tenantId: opts.tenantId, to: opts.to, subject: opts.subject, body: opts.body, status },
  });
  return status;
}
