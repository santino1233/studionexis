import type { Tenant } from "@prisma/client";

// Studio-editable transactional email templates. Defaults live here; studios
// override them in Settings → Security. Placeholders {{studio}}, {{name}},
// {{code}}, {{minutes}} are substituted at send time.
export type EmailTemplate = { subject: string; body: string };
export type TemplateKey = "loginCode";

export const DEFAULT_TEMPLATES: Record<TemplateKey, EmailTemplate> = {
  loginCode: {
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
};

type Store = { emailTemplates?: Partial<Record<TemplateKey, EmailTemplate>> };

export function getTemplate(tenant: Pick<Tenant, "policies">, key: TemplateKey): EmailTemplate {
  const saved = ((tenant.policies ?? {}) as Store).emailTemplates?.[key];
  return { ...DEFAULT_TEMPLATES[key], ...(saved ?? {}) };
}

export function renderTemplate(tpl: EmailTemplate, vars: Record<string, string | number>): EmailTemplate {
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));
  return { subject: fill(tpl.subject), body: fill(tpl.body) };
}
