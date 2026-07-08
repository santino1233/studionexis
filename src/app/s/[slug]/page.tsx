import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { MapPin, Phone, AtSign, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudioSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const brand = tenant.brandColor || "#F97316";
  const w = (tenant.website ?? {}) as Record<string, string>;
  const fmt = moneyFormatter(tenant.currency);

  const [packages, sessions] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" }, take: 6 }),
    db.classSession.findMany({
      where: { tenantId: tenant.id, status: "SCHEDULED", startsAt: { gt: new Date(), lt: new Date(Date.now() + 3 * 86400_000) } },
      include: { classType: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const book = `/book/${slug}`;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}CC)` }}>
        <div className="mx-auto max-w-[860px] px-5 pb-16 pt-12 text-white">
          <div className="mb-10 flex items-center justify-between">
            <div className="font-display text-[20px] font-extrabold tracking-tight">{tenant.name}</div>
            <a href={book} className="rounded-xl bg-white px-4 py-2 text-[13px] font-bold" style={{ color: brand }}>Book a class</a>
          </div>
          <h1 className="max-w-[560px] font-display text-[40px] font-extrabold leading-[1.1] tracking-tight">
            {w.tagline || `Welcome to ${tenant.name}`}
          </h1>
          {w.about && <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-white/85">{w.about}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={book} className="rounded-xl bg-white px-5 py-3 text-[14px] font-bold" style={{ color: brand }}>See the schedule</a>
            <a href={`${book}/me`} className="rounded-xl border border-white/40 px-5 py-3 text-[14px] font-bold text-white">My account</a>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[860px] px-5 py-12">
        {/* Upcoming classes */}
        {sessions.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-[22px] font-extrabold tracking-tight text-ink">Next classes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sessions.map((s) => (
                <a key={s.id} href={book} className="flex items-center justify-between rounded-2xl border border-line-2 bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="size-3 rounded-full" style={{ background: s.classType.color }} />
                    <div>
                      <div className="text-[13.5px] font-bold text-ink">{s.classType.name}</div>
                      <div className="text-[12px] text-muted">
                        {new Date(`${dayKeyInTz(s.startsAt, tenant.timezone)}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short" })} · {timeInTz(s.startsAt, tenant.timezone)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: brand }}>Book →</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Pricing */}
        {packages.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-[22px] font-extrabold tracking-tight text-ink">Packages</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {packages.map((p) => (
                <div key={p.id} className="rounded-2xl border border-line-2 bg-surface p-5 text-center shadow-[var(--shadow-card)]">
                  <div className="text-[14px] font-bold text-ink">{p.name}</div>
                  <div className="mt-2 font-display text-[26px] font-extrabold" style={{ color: brand }}>{fmt.format(Number(p.price))}</div>
                  <div className="mt-1 text-[12px] text-muted">{p.credits} classes · valid {p.validityDays} days</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {(w.address || w.phoneNumber || w.instagram || w.hours) && (
          <section className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 font-display text-[18px] font-extrabold tracking-tight text-ink">Find us</h2>
            <div className="grid grid-cols-1 gap-3 text-[13.5px] text-ink-2 sm:grid-cols-2">
              {w.address && <div className="flex items-center gap-2.5"><MapPin className="size-4 shrink-0" style={{ color: brand }} />{w.address}</div>}
              {w.phoneNumber && <div className="flex items-center gap-2.5"><Phone className="size-4 shrink-0" style={{ color: brand }} />{w.phoneNumber}</div>}
              {w.instagram && <a className="flex items-center gap-2.5 hover:underline" href={`https://instagram.com/${w.instagram}`}><AtSign className="size-4 shrink-0" style={{ color: brand }} />@{w.instagram}</a>}
              {w.hours && <div className="flex items-center gap-2.5"><Clock className="size-4 shrink-0" style={{ color: brand }} />{w.hours}</div>}
            </div>
          </section>
        )}

        <footer className="mt-12 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
