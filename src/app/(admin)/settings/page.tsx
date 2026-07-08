import { Card, CardHeader } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "THB", "VND", "IDR", "PHP", "MYR", "JPY", "KRW", "AED", "INR"];
const TIMEZONES = [
  "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Singapore", "Asia/Jakarta", "Asia/Manila", "Asia/Kuala_Lumpur",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Dubai", "Asia/Kolkata", "Australia/Sydney", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto",
];

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const tenant = await getCurrentTenant();
  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number; cancelWindowPrivateHours?: number; waitlistEnabled?: boolean };

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-muted">Your identity flows through everything — receipts, booking pages, money and times.</p>

      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-bold text-green">Saved.</div>}
      {error === "tz" && <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">That timezone wasn&apos;t recognized.</div>}

      <Card className="mt-6">
        <CardHeader eyebrow="Identity" title="Studio identity" sub="Name, money and time — applied everywhere instantly" />
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="identity" />
          <div>
            <label className={label}>Studio name</label>
            <input name="name" defaultValue={tenant.name} className={field} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>Currency</label>
              <select name="currency" defaultValue={tenant.currency} className={field}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Timezone</label>
              <select name="timezone" defaultValue={tenant.timezone} className={field}>
                {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Brand color</label>
              <input name="brandColor" type="color" defaultValue={tenant.brandColor} className="h-11 w-full cursor-pointer rounded-[10px] border border-line bg-surface p-1" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save identity</button>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Public" title="Website design" sub="Pick a template and colour — preview before you commit" />
        <form method="post" action="/api/settings" className="space-y-5 p-6">
          <input type="hidden" name="section" value="template" />
          {(() => {
            const w = (tenant.website ?? {}) as { template?: string; mapUrl?: string };
            const current = w.template ?? "boutique";
            const templates = [
              ["boutique", "Boutique", "Warm, editorial, personal", "#FAF5EE", "#2A241D", "serif"],
              ["luxury", "Luxury", "Dark, refined, exclusive", "#121110", "#EFEAE2", "serif"],
              ["minimal", "Minimal", "White space, big type", "#FFFFFF", "#111113", "sans"],
              ["serene", "Serene", "Soft, calm, natural", "#F2F4EF", "#2B322B", "sans"],
              ["bold", "Bold", "Loud colour, high energy", "#17181C", "#FFFFFF", "sans"],
            ] as const;
            const swatches = ["#F97316", "#B45309", "#6D8B74", "#0F766E", "#7C3AED", "#BE123C"];
            return (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {templates.map(([id, name, vibe, bg, fg, font]) => (
                    <label key={id} className="relative block cursor-pointer">
                      <input type="radio" name="template" value={id} defaultChecked={current === id} className="peer sr-only" />
                      <div className="overflow-hidden rounded-xl border-2 border-line-2 transition-all hover:border-line peer-checked:border-brand peer-checked:shadow-md">
                        <div className="flex h-[74px] flex-col justify-between p-3" style={{ background: bg, color: fg }}>
                          <span className={`text-[15px] font-bold ${font === "serif" ? "font-serif" : "font-display"}`}>Aa</span>
                          <span className="block h-1.5 w-8 rounded-full" style={{ background: tenant.brandColor }} />
                        </div>
                        <div className="border-t border-line-2 bg-surface px-3 py-2">
                          <div className="text-[12.5px] font-bold text-ink">{name}</div>
                          <div className="text-[10.5px] leading-tight text-muted">{vibe}</div>
                        </div>
                      </div>
                      <span className="pointer-events-none absolute -right-1.5 -top-1.5 hidden size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-white shadow peer-checked:grid">✓</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className={label}>Theme colour</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {swatches.map((c) => (
                      <label key={c} className="cursor-pointer">
                        <input type="radio" name="accent" value={c} defaultChecked={tenant.brandColor.toLowerCase() === c.toLowerCase()} className="peer sr-only" />
                        <span className="block size-8 rounded-full border-2 border-transparent ring-offset-2 transition-all peer-checked:ring-2" style={{ background: c, ["--tw-ring-color" as string]: c }} />
                      </label>
                    ))}
                    <span className="mx-1 text-[12px] text-muted">or</span>
                    <input type="color" name="accentCustom" defaultValue={tenant.brandColor} className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" title="Custom colour" />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted">Your colour flows through the website, booking pages and client portal.</p>
                </div>

                <div>
                  <label className={label}>Google Maps link (or your address)</label>
                  <input name="mapUrl" defaultValue={w.mapUrl ?? ""} placeholder="Paste your Google Maps link — the map appears on your site" className={field} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex gap-3 text-[12.5px]">
                    {templates.map(([id, name]) => (
                      <a key={id} href={`/s/${tenant.slug}?preview=${id}`} target="_blank" className="font-bold text-brand hover:underline">{name}</a>
                    ))}
                  </span>
                  <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save design</button>
                </div>
              </>
            );
          })()}
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Public" title="Your website" sub={`Live at /s/${tenant.slug} — about, pricing and booking, branded to you`} />
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="website" />
          {(() => {
            const w = (tenant.website ?? {}) as Record<string, string>;
            return (
              <>
                <div>
                  <label className={label}>Tagline</label>
                  <input name="tagline" defaultValue={w.tagline ?? ""} placeholder="e.g. Move better. Feel stronger." className={field} />
                </div>
                <div>
                  <label className={label}>About your studio</label>
                  <textarea name="about" rows={4} defaultValue={w.about ?? ""} placeholder="Tell people what makes your studio special…" className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className={label}>Address</label><input name="address" defaultValue={w.address ?? ""} className={field} /></div>
                  <div><label className={label}>Phone</label><input name="phoneNumber" defaultValue={w.phoneNumber ?? ""} className={field} /></div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className={label}>Instagram</label><input name="instagram" defaultValue={w.instagram ?? ""} placeholder="yourstudio" className={field} /></div>
                  <div><label className={label}>Opening hours</label><input name="hours" defaultValue={w.hours ?? ""} placeholder="Mon–Sat 7:00–20:00" className={field} /></div>
                </div>
              </>
            );
          })()}
          <div className="flex items-center justify-between">
            <a href={`/s/${tenant.slug}`} target="_blank" className="text-[13px] font-bold text-brand hover:underline">View my website →</a>
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save website</button>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Public" title="Website photos" sub="Replace the default photography with your own studio shots" />
        <div className="space-y-5 p-6">
          {error === "phototype" && <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">Photos must be JPG, PNG or WebP under 5MB.</div>}
          {(() => {
            const w = (tenant.website ?? {}) as { heroImage?: string; galleryImages?: string[] };
            return (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <img src={w.heroImage ?? "/studio/hero.jpg"} alt="Hero" className="h-20 w-32 rounded-xl object-cover" />
                  <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex items-center gap-2">
                    <input type="hidden" name="kind" value="hero" />
                    <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" required className="text-[12.5px] text-ink-2 file:mr-2 file:rounded-lg file:border-0 file:bg-line-2 file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-ink-2" />
                    <button className="rounded-[10px] bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-ink">Set hero</button>
                  </form>
                </div>
                <div>
                  <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Gallery {w.galleryImages?.length ? `(${w.galleryImages.length}/8)` : "— using default photos"}</div>
                  {!!w.galleryImages?.length && (
                    <div className="mb-3 flex flex-wrap gap-2.5">
                      {w.galleryImages.map((u) => (
                        <div key={u} className="relative">
                          <img src={u} alt="" className="h-16 w-24 rounded-lg object-cover" />
                          <form method="post" action="/api/media/upload" className="absolute -right-1.5 -top-1.5">
                            <input type="hidden" name="kind" value="remove" />
                            <input type="hidden" name="url" value={u} />
                            <button className="grid size-5 place-items-center rounded-full bg-rose text-[10px] font-bold text-white" aria-label="Remove">×</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                  <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex items-center gap-2">
                    <input type="hidden" name="kind" value="gallery" />
                    <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" required className="text-[12.5px] text-ink-2 file:mr-2 file:rounded-lg file:border-0 file:bg-line-2 file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-ink-2" />
                    <button className="rounded-[10px] border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-raised">Add photos</button>
                  </form>
                </div>
              </>
            );
          })()}
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Add-on" title="Custom domain" sub="Serve your website on your own domain" />
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="domain" />
          {error === "domain" && <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">That doesn&apos;t look like a domain (e.g. www.yourstudio.com).</div>}
          {error === "domaintaken" && <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">That domain is already connected to another studio.</div>}
          <div>
            <label className={label}>Your domain</label>
            <div className="flex items-center gap-2">
              <input name="customDomain" defaultValue={tenant.customDomain ?? ""} placeholder="www.yourstudio.com" className={field} />
              {(() => {
                const d = ((tenant.policies ?? {}) as { domain?: { status?: string; error?: string } }).domain;
                if (!tenant.customDomain || !d?.status) return null;
                if (d.status === "LIVE") return <span className="shrink-0 rounded-full bg-green-wash px-3 py-1.5 text-[11px] font-bold text-green">● Live</span>;
                if (d.status === "PENDING_DNS") return <span className="shrink-0 rounded-full bg-brand-wash px-3 py-1.5 text-[11px] font-bold text-brand">Waiting for DNS…</span>;
                return <span className="shrink-0 rounded-full bg-rose/10 px-3 py-1.5 text-[11px] font-bold text-rose" title={d.error ?? ""}>Problem — we&apos;re on it</span>;
              })()}
            </div>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-muted">
            <li>At your domain provider, add an <b>A record</b> pointing to <b className="font-mono">72.62.69.9</b>.</li>
            <li>Save here — that&apos;s it. We check every few minutes, and once your DNS points at us we issue the security certificate and switch your domain on automatically.</li>
            <li>Your website, booking pages and client portal then work on your domain.</li>
          </ol>
          <div className="flex justify-end">
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save domain</button>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Money" title="Expense categories" sub="The choices in your expense form — make them match how you think" />
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="categories" />
          <input
            name="expenseCategories"
            defaultValue={(((tenant.policies ?? {}) as { expenseCategories?: string[] }).expenseCategories ?? []).join(", ")}
            placeholder="Rent, Salaries, Utilities, Equipment, Marketing, Supplies, Software, Other"
            className={field}
          />
          <p className="text-[12px] text-muted">Comma-separated, up to 20. Leave blank to use the standard list.</p>
          <div className="flex justify-end">
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save categories</button>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader eyebrow="Rules" title="Booking policies" sub="What clients feel — cancellation windows and waitlists" />
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="policies" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Free-cancel window — group (hours)</label>
              <input name="cancelWindowGroupHours" type="number" min={0} defaultValue={pol.cancelWindowGroupHours ?? 3} className={field} />
            </div>
            <div>
              <label className={label}>Free-cancel window — private (hours)</label>
              <input name="cancelWindowPrivateHours" type="number" min={0} defaultValue={pol.cancelWindowPrivateHours ?? 3} className={field} />
            </div>
          </div>
          <p className="text-[12px] text-muted">Cancel closer to class start than the window and the credit is forfeited (enforcement lands with the customer booking portal).</p>
          <label className="flex items-center gap-2.5 text-[13.5px] font-medium text-ink">
            <input name="waitlistEnabled" type="checkbox" defaultChecked={pol.waitlistEnabled ?? true} className="size-4 accent-[#F97316]" />
            Waitlist full classes automatically
          </label>
          <div className="flex justify-end">
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save policies</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
