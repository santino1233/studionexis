import type { Tenant } from "@prisma/client";
import { publicSiteUrl } from "@/lib/site-url";

// ---------------------------------------------------------------------------
// Studio-editable transactional email templates.
//
// Every transactional email the app sends is registered here with a sensible
// built-in default, the list of placeholders it understands, and sample data
// used for the live preview. Studios override subject/body per template in
// Settings → Email templates; unset templates fall back to the default here so
// existing sends keep working with zero configuration.
//
// Overrides are stored on `tenant.policies.emailTemplates` (additive JSON, no
// schema change). Placeholders are written {{likeThis}} and substituted at send
// time by renderTemplate(). Rendered emails are wrapped in a branded HTML shell
// that carries the studio's logo + brand colour (see renderBrandedHtml).
// ---------------------------------------------------------------------------

export type EmailTemplate = { subject: string; body: string };

/** Every transactional email type the app actually sends today. */
export type TemplateKey = "loginCode" | "bookingConfirmation" | "waitlist" | "reminder";

export type TemplateVar = { token: string; label: string; sample: string };

export type TemplateMeta = {
  key: TemplateKey;
  label: string;
  /** When this email goes out — shown in the editor. */
  description: string;
  vars: TemplateVar[];
  default: EmailTemplate;
};

// The canonical registry. Order here is the order shown in the admin list.
export const TEMPLATE_META: TemplateMeta[] = [
  {
    key: "bookingConfirmation",
    label: "Booking confirmation",
    description: "Sent to a client the moment they successfully book a class.",
    vars: [
      { token: "studioName", label: "Studio name", sample: "Studio Nexis" },
      { token: "clientName", label: "Client's name", sample: "Alex Rivera" },
      { token: "className", label: "Class name", sample: "Vinyasa Flow" },
      { token: "dateTime", label: "Class date & time", sample: "Saturday, August 9 at 9:00 AM" },
      { token: "manageUrl", label: "Manage-bookings link", sample: "https://studio.example.com/bookings" },
    ],
    default: {
      subject: "Booking confirmed — {{className}} at {{studioName}}",
      body: [
        "Hi {{clientName}},",
        "",
        "You're booked for {{className}} on {{dateTime}}.",
        "",
        "Manage your bookings: {{manageUrl}}",
        "",
        "See you on the mat!",
        "— {{studioName}}",
      ].join("\n"),
    },
  },
  {
    key: "waitlist",
    label: "Waitlist notification",
    description: "Sent when a class is full and the client joins the waitlist.",
    vars: [
      { token: "studioName", label: "Studio name", sample: "Studio Nexis" },
      { token: "clientName", label: "Client's name", sample: "Alex Rivera" },
      { token: "className", label: "Class name", sample: "Vinyasa Flow" },
      { token: "dateTime", label: "Class date & time", sample: "Saturday, August 9 at 9:00 AM" },
      { token: "manageUrl", label: "Manage-bookings link", sample: "https://studio.example.com/bookings" },
    ],
    default: {
      subject: "You're on the waitlist — {{className}} at {{studioName}}",
      body: [
        "Hi {{clientName}},",
        "",
        "You're on the waitlist for {{className}} on {{dateTime}}. We'll email you the moment a spot opens up.",
        "",
        "Manage your bookings: {{manageUrl}}",
        "",
        "— {{studioName}}",
      ].join("\n"),
    },
  },
  {
    key: "reminder",
    label: "Class reminder",
    description: "Sent automatically in the 24 hours before a booked class starts.",
    vars: [
      { token: "studioName", label: "Studio name", sample: "Studio Nexis" },
      { token: "clientName", label: "Client's name", sample: "Alex Rivera" },
      { token: "className", label: "Class name", sample: "Vinyasa Flow" },
      { token: "dateTime", label: "Class date & time", sample: "Saturday, August 9 at 9:00 AM" },
      { token: "manageUrl", label: "Manage-bookings link", sample: "https://studio.example.com/bookings" },
    ],
    default: {
      subject: "Reminder: {{className}} at {{studioName}}",
      body: [
        "Hi {{clientName}},",
        "",
        "See you at {{className}} — {{dateTime}}.",
        "",
        "Need to change plans? Manage your booking: {{manageUrl}}",
        "",
        "— {{studioName}}",
      ].join("\n"),
    },
  },
  {
    key: "loginCode",
    label: "Verification code",
    description: "Sent to staff as a one-time code when login verification (2FA) is on.",
    vars: [
      { token: "studio", label: "Studio name", sample: "Studio Nexis" },
      { token: "name", label: "Staff member's name", sample: "Alex Rivera" },
      { token: "code", label: "6-digit code", sample: "418205" },
      { token: "minutes", label: "Minutes until it expires", sample: "10" },
    ],
    default: {
      subject: "Your {{studio}} verification code",
      body: [
        "Hi {{name}},",
        "",
        "Your verification code is:",
        "",
        "{{code}}",
        "",
        "Enter it to finish signing in. This code expires in {{minutes}} minutes.",
        "",
        "If you didn't try to sign in, you can safely ignore this email — your account is still secure.",
        "",
        "— {{studio}}",
      ].join("\n"),
    },
  },
];

const META_BY_KEY: Record<TemplateKey, TemplateMeta> = Object.fromEntries(
  TEMPLATE_META.map((m) => [m.key, m]),
) as Record<TemplateKey, TemplateMeta>;

export const DEFAULT_TEMPLATES: Record<TemplateKey, EmailTemplate> = Object.fromEntries(
  TEMPLATE_META.map((m) => [m.key, m.default]),
) as Record<TemplateKey, EmailTemplate>;

export function isTemplateKey(k: string): k is TemplateKey {
  return k in META_BY_KEY;
}

export function templateMeta(key: TemplateKey): TemplateMeta {
  return META_BY_KEY[key];
}

/** Sample values keyed by placeholder token — drives the live preview. */
export function sampleVarsFor(key: TemplateKey): Record<string, string> {
  return Object.fromEntries(META_BY_KEY[key].vars.map((v) => [v.token, v.sample]));
}

type Store = { emailTemplates?: Partial<Record<TemplateKey, EmailTemplate>> };

/** The effective template for a studio: its override merged over the default. */
export function getTemplate(tenant: Pick<Tenant, "policies">, key: TemplateKey): EmailTemplate {
  const saved = ((tenant.policies ?? {}) as Store).emailTemplates?.[key];
  return { ...DEFAULT_TEMPLATES[key], ...(saved ?? {}) };
}

/** True when the studio has customised this template (i.e. reset would change it). */
export function hasOverride(tenant: Pick<Tenant, "policies">, key: TemplateKey): boolean {
  return !!((tenant.policies ?? {}) as Store).emailTemplates?.[key];
}

/** Substitute {{token}} placeholders in subject + body. Unknown tokens → "". */
export function renderTemplate(tpl: EmailTemplate, vars: Record<string, string | number>): EmailTemplate {
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));
  return { subject: fill(tpl.subject), body: fill(tpl.body) };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turn a plain-text body into simple HTML: links become anchors, newlines
// become <br>, blank lines separate paragraphs. Kept deliberately small — this
// is a transactional email, not a newsletter.
function bodyToHtml(body: string): string {
  const linkify = (line: string) =>
    escapeHtml(line).replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) => `<a href="${url}" style="color:#2563eb;text-decoration:underline;">${url}</a>`,
    );
  return body
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;">${para.split("\n").map(linkify).join("<br>")}</p>`)
    .join("");
}

export type Branding = { name: string; logoUrl?: string | null; brandColor?: string | null };

/**
 * Wrap a rendered plain-text body in a branded, email-client-safe HTML shell
 * carrying the studio logo (or its name) and brand-colour accent. `logoUrl`
 * should already be absolute — see absoluteLogoUrl().
 */
export function renderBrandedHtml(brand: Branding, bodyText: string): string {
  const accent = /^#[0-9a-fA-F]{6}$/.test(brand.brandColor ?? "") ? brand.brandColor! : "#F97316";
  const header = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" style="max-height:48px;max-width:220px;display:block;margin:0 auto;">`
    : `<div style="font-size:20px;font-weight:800;color:${accent};text-align:center;letter-spacing:-0.01em;">${escapeHtml(brand.name)}</div>`;
  return [
    `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">`,
    `<tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;">`,
    `<tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `<tr><td style="padding:28px 32px 8px;">${header}</td></tr>`,
    `<tr><td style="padding:8px 32px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#27272a;">`,
    bodyToHtml(bodyText),
    `</td></tr>`,
    `<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;text-align:center;">Sent by ${escapeHtml(brand.name)}</td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("");
}

/** Resolve the studio logo to an absolute URL usable inside an email. */
export function absoluteLogoUrl(
  tenant: Pick<Tenant, "logoUrl" | "slug" | "customDomain" | "policies">,
): string | null {
  if (!tenant.logoUrl) return null;
  if (/^https?:\/\//.test(tenant.logoUrl)) return tenant.logoUrl;
  return `${publicSiteUrl(tenant)}${tenant.logoUrl.startsWith("/") ? "" : "/"}${tenant.logoUrl}`;
}

/**
 * One-stop builder for a send path: resolve the studio's effective template,
 * substitute variables, and produce the plain-text body plus the branded HTML
 * (with logo) for delivery. `body` is the plain-text version stored in EmailLog.
 */
export function buildEmail(
  tenant: Pick<Tenant, "policies" | "name" | "logoUrl" | "slug" | "customDomain" | "brandColor">,
  key: TemplateKey,
  vars: Record<string, string | number>,
): { subject: string; body: string; html: string } {
  const rendered = renderTemplate(getTemplate(tenant, key), vars);
  const html = renderBrandedHtml(
    { name: tenant.name, logoUrl: absoluteLogoUrl(tenant), brandColor: tenant.brandColor },
    rendered.body,
  );
  return { subject: rendered.subject, body: rendered.body, html };
}
