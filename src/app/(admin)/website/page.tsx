import Link from "next/link";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { SECTION_IDS, SECTION_LABELS, TEMPLATE_META, type SectionId, type SiteFaq, type SiteQuote, type TemplateId } from "@/components/site/types";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const area = "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const save = "rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink";

function Toggle({ id, on }: { id: SectionId; on: boolean }) {
  return (
    <form method="post" action="/api/website">
      <input type="hidden" name="section" value="toggle" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="show" value={on ? "0" : "1"} />
      <button
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold ${on ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}
        title={on ? "Shown on your site — click to hide" : "Hidden — click to show"}
      >
        {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        {on ? "Shown" : "Hidden"}
      </button>
    </form>
  );
}

export default async function WebsiteBuilderPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const tenant = await getCurrentTenant();
  const w = (tenant.website ?? {}) as Record<string, string> & {
    why?: string[];
    testimonials?: SiteQuote[];
    faqs?: SiteFaq[];
    sections?: Partial<Record<SectionId, boolean>>;
    sectionOrder?: SectionId[];
    teamBios?: Record<string, { bio?: string; photo?: string; hidden?: boolean }>;
    template?: string;
  };
  const on = (id: SectionId) => w.sections?.[id] ?? true;
  const instructors = await db.user.findMany({ where: { tenantId: tenant.id, active: true, role: "INSTRUCTOR" }, orderBy: { name: "asc" } });
  const testimonials = w.testimonials ?? [];
  const faqs = w.faqs ?? [];
  const template = (w.template ?? "boutique") as TemplateId;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Website</h1>
          <p className="mt-1 text-sm text-muted">
            Customize your template — show or hide sections, and make every word yours. Template &amp; colours live in{" "}
            <Link href="/settings" className="font-bold text-brand hover:underline">Settings</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2">Template: {TEMPLATE_META[template]?.name ?? template}</span>
          <Link href="/website/editor" className="rounded-[10px] border border-line-2 px-4 py-2.5 text-[13px] font-bold text-ink-2 hover:text-ink">🧱 Advanced editor</Link>
          <Link href="/website/setup" className="rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-bold text-canvas hover:opacity-90">✨ Create my website</Link>
          <a href={`/s/${tenant.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">
            <ExternalLink className="size-3.5" /> Open my site
          </a>
        </div>
      </div>

      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Saved — your site is updated.</div>}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between pr-5"><CardHeader title={SECTION_LABELS.about} sub="Your story and what makes the studio special" /><Toggle id="about" on={on("about")} /></div>
            <form method="post" action="/api/website" className="space-y-3.5 p-5 pt-0">
              <input type="hidden" name="section" value="about" />
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Philosophy</label>
                <textarea name="philosophy" rows={4} defaultValue={w.philosophy ?? ""} placeholder="What you believe about movement, coaching and community…" className={area} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Why choose us — one point per line</label>
                <textarea name="why" rows={4} defaultValue={(w.why ?? []).join("\n")} placeholder={"Small classes with real coaching\nCertified instructors"} className={area} />
              </div>
              <button className={save}>Save about</button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between pr-5"><CardHeader title={SECTION_LABELS.testimonials} sub="Quotes from happy clients — add as many as you like" /><Toggle id="testimonials" on={on("testimonials")} /></div>
            <form method="post" action="/api/website" className="space-y-4 p-5 pt-0">
              <input type="hidden" name="section" value="testimonials" />
              {Array.from({ length: testimonials.length + 2 }, (_, i) => (
                <div key={i} className="grid grid-cols-[1fr_150px] gap-2">
                  <input name={`quote${i}`} defaultValue={testimonials[i]?.quote ?? ""} placeholder={i < testimonials.length ? `Quote ${i + 1}` : "Add another quote…"} className={field} />
                  <input name={`name${i}`} defaultValue={testimonials[i]?.name ?? ""} placeholder="Name" className={field} />
                </div>
              ))}
              <button className={save}>Save testimonials</button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between pr-5"><CardHeader title={SECTION_LABELS.faq} sub="Answer the questions every new client asks — unlimited" /><Toggle id="faq" on={on("faq")} /></div>
            <form method="post" action="/api/website" className="space-y-4 p-5 pt-0">
              <input type="hidden" name="section" value="faqs" />
              {Array.from({ length: faqs.length + 2 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <input name={`q${i}`} defaultValue={faqs[i]?.q ?? ""} placeholder={i < faqs.length ? `Question ${i + 1}` : "Add another question…"} className={field} />
                  <textarea name={`a${i}`} rows={2} defaultValue={faqs[i]?.a ?? ""} placeholder="Answer" className={area} />
                </div>
              ))}
              <p className="text-[12px] text-muted">Leave blank to use our friendly defaults (booking, what to bring, beginners, cancellation).</p>
              <button className={save}>Save FAQ</button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between pr-5"><CardHeader title={SECTION_LABELS.team} sub="Bios and photos for your instructors" /><Toggle id="team" on={on("team")} /></div>
            <div className="space-y-5 p-5 pt-0">
              {instructors.length === 0 && <p className="text-[13px] text-muted">Add instructors under <Link href="/team" className="font-bold text-brand hover:underline">Team</Link> and they appear here.</p>}
              {instructors.map((u) => {
                const b = w.teamBios?.[u.id];
                return (
                  <div key={u.id} className="rounded-xl border border-line-2 p-4">
                    <div className="flex items-center gap-3">
                      {b?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.photo} alt={u.name} className="size-12 rounded-full object-cover" />
                      ) : (
                        <div className="grid size-12 place-items-center rounded-full bg-brand text-[16px] font-bold text-white">{u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[14px] font-bold text-ink">{u.name}</div>
                          <form method="post" action="/api/website">
                            <input type="hidden" name="section" value="team-toggle" />
                            <input type="hidden" name="userId" value={u.id} />
                            <button className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${b?.hidden ? "bg-line-2 text-muted" : "bg-green-wash text-green"}`}>{b?.hidden ? "Hidden" : "On site"}</button>
                          </form>
                        </div>
                        <form method="post" action="/api/media/upload" encType="multipart/form-data" className="mt-1 flex items-center gap-2">
                          <input type="hidden" name="kind" value="teamphoto" />
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" required className="min-w-0 flex-1 text-[11.5px] text-muted file:mr-2 file:rounded-md file:border-0 file:bg-line-2 file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-ink-2" />
                          <button className="shrink-0 rounded-lg bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:text-ink">{b?.photo ? "Replace" : "Upload"}</button>
                        </form>
                      </div>
                    </div>
                    <form method="post" action="/api/website" className="mt-3 flex gap-2">
                      <input type="hidden" name="section" value="team" />
                      <input name={`bio_${u.id}`} defaultValue={b?.bio ?? ""} placeholder="Short bio — training style, certifications, what clients love" className={field} />
                      <button className="shrink-0 rounded-[10px] bg-line-2 px-4 text-[12.5px] font-bold text-ink-2 hover:text-ink">Save</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between pr-5"><CardHeader title={SECTION_LABELS.contact} sub="Address, hours, map and social links" /><Toggle id="contact" on={on("contact")} /></div>
            <form method="post" action="/api/website" className="space-y-3 p-5 pt-0">
              <input type="hidden" name="section" value="contact" />
              <input name="address" defaultValue={w.address ?? ""} placeholder="Street address" className={field} />
              <div className="grid grid-cols-2 gap-3">
                <input name="phoneNumber" defaultValue={w.phoneNumber ?? ""} placeholder="Phone" className={field} />
                <input name="hours" defaultValue={w.hours ?? ""} placeholder="Hours — e.g. Mon–Sat 7:00–20:00" className={field} />
              </div>
              <input name="mapUrl" defaultValue={w.mapUrl ?? ""} placeholder="Google Maps link (share link or address)" className={field} />
              <div className="grid grid-cols-3 gap-3">
                <input name="instagram" defaultValue={w.instagram ?? ""} placeholder="Instagram" className={field} />
                <input name="facebook" defaultValue={w.facebook ?? ""} placeholder="Facebook" className={field} />
                <input name="tiktok" defaultValue={w.tiktok ?? ""} placeholder="TikTok" className={field} />
              </div>
              <button className={save}>Save contact</button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Section order" sub="Arrange your page — top to bottom" />
            <div className="space-y-1.5 p-5 pt-0">
              {(() => {
                const base = ["about", "classes", "schedule", "team", "pricing", "testimonials", "gallery", "faq"] as SectionId[];
                const saved = (w.sectionOrder ?? []).filter((id) => base.includes(id));
                const order = [...saved, ...base.filter((id) => !saved.includes(id))];
                return order.map((id, i) => (
                  <div key={id} className="flex items-center justify-between rounded-lg border border-line-2 px-3 py-2">
                    <span className={`text-[13px] font-bold ${on(id) ? "text-ink" : "text-muted line-through"}`}>{i + 1}. {SECTION_LABELS[id]}</span>
                    <span className="flex gap-1">
                      <form method="post" action="/api/website"><input type="hidden" name="section" value="reorder" /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="grid size-7 place-items-center rounded-md bg-line-2 text-[12px] font-bold text-ink-2 hover:text-ink disabled:opacity-30">↑</button></form>
                      <form method="post" action="/api/website"><input type="hidden" name="section" value="reorder" /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value="down" /><button disabled={i === order.length - 1} className="grid size-7 place-items-center rounded-md bg-line-2 text-[12px] font-bold text-ink-2 hover:text-ink disabled:opacity-30">↓</button></form>
                    </span>
                  </div>
                ));
              })()}
            </div>
          </Card>

          <Card>
            <CardHeader title="Automatic sections" sub="Filled from your studio data — just choose what shows" />
            <div className="space-y-3 p-5 pt-0">
              {([
                ["classes", "Pulled from your class blueprints — descriptions, difficulty, benefits and hero images.", "/class-types", "Edit class types"],
                ["schedule", "Shows this week's public classes with live times.", "/schedule", "Open schedule"],
                ["pricing", "Your active packages with prices and validity.", "/products", "Edit packages"],
                ["gallery", "Studio photos — upload them in Settings.", "/settings", "Manage photos"],
              ] as [SectionId, string, string, string][]).map(([id, desc, href, cta]) => (
                <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-line-2 px-4 py-3">
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">{SECTION_LABELS[id]}</div>
                    <div className="text-[12px] text-muted">{desc} <Link href={href} className="font-bold text-brand hover:underline">{cta}</Link></div>
                  </div>
                  <Toggle id={id} on={on(id)} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line-2 bg-surface p-5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-muted">Preview your content in every template</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {Object.entries(TEMPLATE_META).map(([id, m]) => (
            <a key={id} href={`/s/${tenant.slug}?preview=${id}`} target="_blank" className={`rounded-full border px-4 py-2 text-[12.5px] font-bold ${id === template ? "border-brand bg-brand-wash text-brand" : "border-line-2 text-ink-2 hover:text-ink"}`}>
              {m.name}{id === template ? " · current" : ""}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
