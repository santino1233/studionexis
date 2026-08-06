"use client";

import { useRef, useState } from "react";

// Shape passed from the (server) settings page — plain data only.
export type EditorVar = { token: string; label: string; sample: string };
export type EditorTemplate = {
  key: string;
  label: string;
  description: string;
  vars: EditorVar[];
  current: { subject: string; body: string };
  default: { subject: string; body: string };
  overridden: boolean;
};
export type EditorBrand = { name: string; logoUrl: string | null; brandColor: string };

function fill(s: string, vars: Record<string, string>) {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
}

function linkify(line: string, accent: string): React.ReactNode[] {
  const parts = line.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <span key={i} style={{ color: accent, textDecoration: "underline" }}>{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function EmailTemplatesEditor({
  templates,
  brand,
  savedKey,
}: {
  templates: EditorTemplate[];
  brand: EditorBrand;
  savedKey?: string;
}) {
  const [active, setActive] = useState(0);
  const t = templates[active];

  // One draft per template, seeded from its saved/effective value.
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>(
    () => Object.fromEntries(templates.map((tpl) => [tpl.key, { ...tpl.current }])),
  );
  const draft = drafts[t.key];
  const setDraft = (patch: Partial<{ subject: string; body: string }>) =>
    setDrafts((d) => ({ ...d, [t.key]: { ...d[t.key], ...patch } }));

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  function insertToken(token: string) {
    const snippet = `{{${token}}}`;
    if (lastFocused.current === "subject") {
      const el = subjectRef.current;
      const pos = el?.selectionStart ?? draft.subject.length;
      const next = draft.subject.slice(0, pos) + snippet + draft.subject.slice(pos);
      setDraft({ subject: next });
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + snippet.length, pos + snippet.length); });
    } else {
      const el = bodyRef.current;
      const pos = el?.selectionStart ?? draft.body.length;
      const next = draft.body.slice(0, pos) + snippet + draft.body.slice(pos);
      setDraft({ body: next });
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + snippet.length, pos + snippet.length); });
    }
  }

  const sample: Record<string, string> = Object.fromEntries(t.vars.map((v) => [v.token, v.sample]));
  const previewSubject = fill(draft.subject, sample);
  const previewBody = fill(draft.body, sample);
  const accent = /^#[0-9a-fA-F]{6}$/.test(brand.brandColor) ? brand.brandColor : "#F97316";

  const inputCls = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

  return (
    <div className="space-y-5">
      {savedKey && (
        <div className="rounded-xl border border-green/20 bg-green-wash px-4 py-2.5 text-[13px] text-green">
          Saved — the new template is live for every future send.
        </div>
      )}

      {!brand.logoUrl && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          <b>Add your logo</b> to make these emails unmistakably yours — it appears at the top of every message. Upload one just below.
        </div>
      )}

      {/* Logo upload — surfaced here so studios that skipped it in the wizard can add it. */}
      <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex flex-wrap items-center gap-3 rounded-xl border border-line-2 bg-raised/40 px-4 py-3">
        <input type="hidden" name="kind" value="logo" />
        <input type="hidden" name="next" value="/settings?tab=emails" />
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt={brand.name} className="h-9 max-w-[160px] object-contain" />
        ) : (
          <span className="text-[13px] font-semibold text-muted">No logo yet</span>
        )}
        <input type="file" name="photos" accept="image/png,image/jpeg,image/webp" className="text-[12.5px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-line-2 file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-ink-2" />
        <button className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white hover:opacity-90">Upload logo</button>
      </form>

      {/* Template list */}
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl, i) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-[10px] border px-3.5 py-2 text-left text-[12.5px] font-bold transition-colors ${
              i === active ? "border-brand bg-brand/5 text-ink" : "border-line-2 text-muted hover:text-ink"
            }`}
          >
            <span className="flex items-center gap-2">
              {tpl.label}
              {drafts[tpl.key] && (drafts[tpl.key].subject !== tpl.default.subject || drafts[tpl.key].body !== tpl.default.body) && (
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-brand">custom</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div>
          <p className="mb-3 text-[12.5px] text-muted">{t.description}</p>
          <form method="post" action="/api/settings" className="space-y-3">
            <input type="hidden" name="section" value="emailtpl" />
            <input type="hidden" name="key" value={t.key} />
            <input type="hidden" name="next" value={`/settings?tab=emails&saved=${t.key}`} />
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Subject</label>
              <input
                ref={subjectRef}
                name="tplSubject"
                value={draft.subject}
                onChange={(e) => setDraft({ subject: e.target.value })}
                onFocus={() => (lastFocused.current = "subject")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Body</label>
              <textarea
                ref={bodyRef}
                name="tplBody"
                value={draft.body}
                onChange={(e) => setDraft({ body: e.target.value })}
                onFocus={() => (lastFocused.current = "body")}
                rows={12}
                className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 font-mono text-[12.5px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>

            {/* Variable palette */}
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">Insert a variable</div>
              <div className="flex flex-wrap gap-1.5">
                {t.vars.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertToken(v.token)}
                    title={v.label}
                    className="rounded-lg border border-line-2 bg-raised/50 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand"
                  >
                    {`{{${v.token}}}`}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted">Click to drop it in at the cursor. Each is replaced with real data when the email sends.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button className="rounded-[10px] bg-brand px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">Save template</button>
              <button
                type="button"
                onClick={() => setDraft({ ...t.default })}
                className="rounded-[10px] border border-line-2 px-3.5 py-2.5 text-[13px] font-bold text-ink-2 hover:bg-raised"
              >
                Restore default text
              </button>
            </div>
          </form>

          {t.overridden && (
            <form method="post" action="/api/settings" className="mt-2">
              <input type="hidden" name="section" value="emailtpl" />
              <input type="hidden" name="key" value={t.key} />
              <input type="hidden" name="action" value="reset" />
              <input type="hidden" name="next" value={`/settings?tab=emails&saved=${t.key}`} />
              <button className="text-[12px] font-semibold text-muted underline hover:text-rose">Reset to default &amp; discard my saved version</button>
            </form>
          )}
        </div>

        {/* Live preview */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Live preview</div>
          <div className="rounded-2xl border border-line-2 bg-[#f4f4f5] p-4">
            <div className="mb-2 text-[12px] text-ink-2">
              <span className="font-semibold text-ink">Subject:</span> {previewSubject || <span className="text-muted">(empty)</span>}
            </div>
            <div className="overflow-hidden rounded-[14px] border border-[#e4e4e7] bg-white">
              <div style={{ height: 4, background: accent }} />
              <div className="px-6 pt-6 pb-2 text-center">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="mx-auto max-h-12 max-w-[220px] object-contain" />
                ) : (
                  <div className="text-[20px] font-extrabold" style={{ color: accent }}>{brand.name}</div>
                )}
              </div>
              <div className="px-6 pb-6 pt-2 text-[14px] leading-relaxed text-[#27272a]">
                {previewBody.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className="mb-3">
                    {para.split("\n").map((line, j) => (
                      <span key={j}>
                        {linkify(line, "#2563eb")}
                        {j < para.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
              <div className="border-t border-[#f0f0f1] px-6 py-3 text-center text-[12px] text-[#a1a1aa]">Sent by {brand.name}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
