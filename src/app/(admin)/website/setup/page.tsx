import Link from "next/link";
import { Check, Globe, PartyPopper, Sparkles } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";
import { TEMPLATE_META, type TemplateId } from "@/components/site/types";
import { publicSiteUrl } from "@/lib/site-url";
import { BASE_DOMAIN } from "@/lib/config";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const area = "w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const STEPS = ["template", "words", "photos", "contact", "done"] as const;

// "Create my website" wizard (Wave 14 V8) — new studios go template →
// words → photos → contact and come out with a live site.
export default async function SiteSetupWizard({ searchParams }: { searchParams: Promise<{ step?: string; error?: string }> }) {
  const { step: raw, error } = await searchParams;
  const tenant = await getCurrentTenant();
  const w = (tenant.website ?? {}) as Record<string, string>;
  const step = (STEPS as readonly string[]).includes(raw ?? "") ? (raw as (typeof STEPS)[number]) : "template";
  const idx = STEPS.indexOf(step);
  const next = (n: (typeof STEPS)[number]) => `/website/setup?step=${n}`;
  const current = (w.template ?? "boutique") as TemplateId;

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink"><Sparkles className="inline size-5 -mt-1" /> Create my website</h1>
        <Link href="/website" className="text-[12.5px] font-bold text-muted hover:text-ink">Exit wizard</Link>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line-2">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-wider text-muted">Step {idx + 1} of {STEPS.length}</p>

      {step === "template" && (
        <form method="post" action="/api/settings" className="mt-6 space-y-4">
          <input type="hidden" name="section" value="template" />
          <input type="hidden" name="next" value={next("words")} />
          <h2 className="text-[16px] font-bold text-ink">Pick the look</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.entries(TEMPLATE_META) as [TemplateId, (typeof TEMPLATE_META)[TemplateId]][]).map(([id, m]) => (
              <label key={id} className="relative block cursor-pointer">
                <input type="radio" name="template" value={id} defaultChecked={current === id} className="peer sr-only" />
                <div className="rounded-xl border-2 border-line-2 p-3 transition-all peer-checked:border-brand peer-checked:shadow-md">
                  <div className="flex h-[64px] items-end rounded-lg p-2" style={{ background: m.bg, color: m.fg }}>
                    <span className={`text-[16px] font-bold ${m.serif ? "font-serif" : "font-display"}`}>Aa</span>
                  </div>
                  <div className="mt-2 text-[13px] font-bold text-ink">{m.name}</div>
                  <div className="text-[10.5px] leading-tight text-muted">{m.vibe}</div>
                </div>
              </label>
            ))}
          </div>
          <button className="w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Continue →</button>
        </form>
      )}

      {step === "words" && (
        <form method="post" action="/api/settings" className="mt-6 space-y-4">
          <input type="hidden" name="section" value="website" />
          <input type="hidden" name="next" value={next("photos")} />
          <h2 className="text-[16px] font-bold text-ink">Your words</h2>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Tagline — the big headline</label>
            <input name="tagline" defaultValue={w.tagline ?? ""} placeholder="Move better. Feel stronger." className={field} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">About your studio</label>
            <textarea name="about" rows={3} defaultValue={w.about ?? ""} placeholder="A sentence or two about who you are and what you offer." className={area} />
          </div>
          <input type="hidden" name="address" value={w.address ?? ""} />
          <input type="hidden" name="phoneNumber" value={w.phoneNumber ?? ""} />
          <input type="hidden" name="instagram" value={w.instagram ?? ""} />
          <input type="hidden" name="hours" value={w.hours ?? ""} />
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Continue →</button>
            <Link href={next("photos")} className="rounded-xl border border-line-2 px-5 py-3 text-[13px] font-bold text-ink-2">Skip</Link>
          </div>
        </form>
      )}

      {step === "photos" && (
        <div className="mt-6 space-y-4">
          <h2 className="text-[16px] font-bold text-ink">Photos</h2>
          {error && <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
            {error === "phototype" ? "That file didn't work — use JPG, PNG or WebP up to 12 MB (iPhone HEIC isn't supported yet — export as JPG)." : "Pick a photo first, then hit Upload."}
          </div>}
          <p className="text-[13px] text-muted">A hero shot makes the biggest difference. Until you upload, tasteful neutral art fills in.</p>
          <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex items-center gap-3 rounded-xl border border-line-2 p-4">
            <input type="hidden" name="kind" value="hero" />
            <input type="hidden" name="next" value={next("photos")} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-ink">Hero image {w.heroImage ? <span className="inline-flex items-center gap-0.5 text-green"><Check className="size-3" /> uploaded</span> : ""}</div>
              <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-[12px] text-muted file:mr-2 file:rounded-md file:border-0 file:bg-line-2 file:px-2 file:py-1 file:text-[11px] file:font-bold" />
            </div>
            <button className="shrink-0 rounded-lg bg-line-2 px-3 py-2 text-[12px] font-bold text-ink-2 hover:text-ink">Upload</button>
          </form>
          <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex items-center gap-3 rounded-xl border border-line-2 p-4">
            <input type="hidden" name="kind" value="gallery" />
            <input type="hidden" name="next" value={next("photos")} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-ink">Gallery photos (up to 8)</div>
              <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 w-full text-[12px] text-muted file:mr-2 file:rounded-md file:border-0 file:bg-line-2 file:px-2 file:py-1 file:text-[11px] file:font-bold" />
            </div>
            <button className="shrink-0 rounded-lg bg-line-2 px-3 py-2 text-[12px] font-bold text-ink-2 hover:text-ink">Upload</button>
          </form>
          <Link href={next("contact")} className="block w-full rounded-xl bg-brand py-3 text-center text-[14px] font-bold text-white hover:bg-brand-ink">Continue →</Link>
        </div>
      )}

      {step === "contact" && (
        <form method="post" action="/api/website" className="mt-6 space-y-4">
          <input type="hidden" name="section" value="contact" />
          <input type="hidden" name="next" value={next("done")} />
          <h2 className="text-[16px] font-bold text-ink">Where to find you</h2>
          <input name="address" defaultValue={w.address ?? ""} placeholder="Street address" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <input name="phoneNumber" defaultValue={w.phoneNumber ?? ""} placeholder="Phone" className={field} />
            <input name="hours" defaultValue={w.hours ?? ""} placeholder="Hours — Mon–Sat 7:00–20:00" className={field} />
          </div>
          <input name="mapUrl" defaultValue={w.mapUrl ?? ""} placeholder="Google Maps link (optional)" className={field} />
          <div className="grid grid-cols-3 gap-3">
            <input name="instagram" defaultValue={w.instagram ?? ""} placeholder="Instagram" className={field} />
            <input name="facebook" defaultValue={w.facebook ?? ""} placeholder="Facebook" className={field} />
            <input name="tiktok" defaultValue={w.tiktok ?? ""} placeholder="TikTok" className={field} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Finish →</button>
            <Link href={next("done")} className="rounded-xl border border-line-2 px-5 py-3 text-[13px] font-bold text-ink-2">Skip</Link>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="mt-10 rounded-3xl border border-line-2 bg-surface p-10 text-center shadow-[var(--shadow-card)]">
          <div className="text-[44px]"><PartyPopper className="mx-auto size-11 text-brand" /></div>
          <h2 className="mt-3 font-display text-[26px] font-extrabold tracking-tight text-ink">Your website is live!</h2>
          <p className="mt-2 text-[14px] text-muted">Fine-tune sections, testimonials, FAQs and your team anytime in the Website builder.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <a href={publicSiteUrl(tenant)} target="_blank" className="rounded-xl bg-brand px-6 py-3 text-[13.5px] font-bold text-white hover:bg-brand-ink">Open my website ↗</a>
            <Link href="/website" className="rounded-xl border border-line-2 px-6 py-3 text-[13.5px] font-bold text-ink-2 hover:text-ink">Open the builder</Link>
          </div>
          <div className="mx-auto mt-6 max-w-[420px] rounded-2xl border-2 border-brand/25 bg-brand-wash/40 p-5 text-left">
            <div className="text-[13.5px] font-extrabold text-ink"><Globe className="inline size-4 -mt-0.5" /> Make it truly yours — <span className="text-brand">yourstudio.com</span></div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">Your site currently lives at {tenant.slug}.{BASE_DOMAIN}. Add a custom domain for <b>$12/mo</b> — automatic setup, free SSL.</p>
            <Link href="/settings?tab=domain" className="mt-2.5 inline-block rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-ink">Get my domain →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
