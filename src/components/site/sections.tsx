import type { SiteData, SiteSkin } from "@/components/site/types";

// Shared, skin-driven sections used by all five templates (Wave 11 Y1).
// Each template supplies its SiteSkin; sections adopt its colors, corner
// radius and type so they read as part of that design.

const font = (s: SiteSkin) => (s.serif ? "font-serif" : "");
const MUTED = { opacity: 0.68 };

export function SectionHeading({ d, s, kicker, title }: { d: SiteData; s: SiteSkin; kicker: string; title: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: d.brand }}>{kicker}</div>
      <h2 className={`mt-3 text-[30px] leading-tight tracking-tight sm:text-[34px] ${font(s)} ${s.serif ? "font-medium" : "font-extrabold"}`}>{title}</h2>
    </div>
  );
}

export function AboutSection({ d, s }: { d: SiteData; s: SiteSkin }) {
  if (!d.enabled.about) return null;
  return (
    <section id="about" className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
      <div className="grid items-start gap-10 md:grid-cols-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: d.brand }}>Our philosophy</div>
          <h2 className={`mt-3 text-[30px] leading-tight tracking-tight sm:text-[34px] ${font(s)} ${s.serif ? "font-medium" : "font-extrabold"}`}>
            Movement that meets you where you are
          </h2>
          <p className="mt-5 max-w-[460px] text-[15px] leading-relaxed" style={MUTED}>{d.philosophy}</p>
        </div>
        {d.why.length > 0 && (
          <ul className="space-y-4 md:pt-12">
            {d.why.map((w) => (
              <li key={w} className="flex items-start gap-3.5 border-b pb-4 text-[15px] font-medium last:border-0" style={{ borderColor: s.line }}>
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: d.brand }}>✦</span>
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ClassesShowcase({ d, s }: { d: SiteData; s: SiteSkin }) {
  if (!d.enabled.classes || d.classes.length === 0) return null;
  return (
    <section id="classes" style={{ background: s.bg2 }}>
      <div className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
        <SectionHeading d={d} s={s} kicker="What we teach" title="Our classes" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {d.classes.map((c) => (
            <a key={c.id} href={`${d.bookHref}`} className="group overflow-hidden transition-transform hover:-translate-y-1" style={{ background: s.cardBg, borderRadius: s.radius, border: `1px solid ${s.line}` }}>
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} className="h-[150px] w-full object-cover" />
              ) : (
                <div className="h-[10px] w-full" style={{ background: c.color }} />
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-[19px] ${font(s)} ${s.serif ? "font-medium" : "font-bold"}`}>{c.name}</h3>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px] font-bold uppercase tracking-wider">
                  {c.format && <span className="rounded-full px-2.5 py-1" style={{ background: `${c.color}22`, color: s.dark ? "#fff" : c.color }}>{c.format}</span>}
                  <span className="rounded-full px-2.5 py-1" style={{ background: s.dark ? "#ffffff1a" : "#00000010" }}>{c.difficulty}</span>
                </div>
                {c.description && <p className="mt-3 text-[13.5px] leading-relaxed" style={MUTED}>{c.description.length > 130 ? `${c.description.slice(0, 130)}…` : c.description}</p>}
                {c.benefits.length > 0 && (
                  <p className="mt-3 text-[12px] font-semibold" style={{ color: d.brand }}>{c.benefits.slice(0, 3).join(" · ")}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-[13px] font-bold">
                  <span style={MUTED}>{c.price} / class</span>
                  <span style={{ color: d.brand }}>Book →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamSection({ d, s }: { d: SiteData; s: SiteSkin }) {
  if (!d.enabled.team || d.team.length === 0) return null;
  return (
    <section id="team" className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
      <SectionHeading d={d} s={s} kicker="Meet the team" title="Your instructors" />
      <div className="mx-auto mt-10 grid max-w-[820px] gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {d.team.map((t) => (
          <div key={t.name} className="p-6 text-center" style={{ background: s.cardBg, borderRadius: s.radius, border: `1px solid ${s.line}` }}>
            {t.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photo} alt={t.name} className="mx-auto size-[88px] rounded-full object-cover" />
            ) : (
              <div className="mx-auto grid size-[88px] place-items-center rounded-full text-[26px] font-bold text-white" style={{ background: d.brand }}>
                {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
            )}
            <div className={`mt-4 text-[17px] ${font(s)} ${s.serif ? "font-medium" : "font-bold"}`}>{t.name}</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: d.brand }}>{t.role}</div>
            {t.bio && <p className="mt-3 text-[13px] leading-relaxed" style={MUTED}>{t.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Testimonials({ d, s }: { d: SiteData; s: SiteSkin }) {
  if (!d.enabled.testimonials || d.testimonials.length === 0) return null;
  return (
    <section id="testimonials" style={{ background: s.bg2 }}>
      <div className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
        <SectionHeading d={d} s={s} kicker="Kind words" title="What our clients say" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {d.testimonials.map((t) => (
            <figure key={t.name} className="p-7" style={{ background: s.cardBg, borderRadius: s.radius, border: `1px solid ${s.line}` }}>
              <div className="text-[20px] tracking-[0.15em]" style={{ color: d.brand }}>★★★★★</div>
              <blockquote className={`mt-4 text-[15px] leading-relaxed ${s.serif ? "font-serif italic" : ""}`}>&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-[13px] font-bold" style={MUTED}>— {t.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ d, s }: { d: SiteData; s: SiteSkin }) {
  if (!d.enabled.faq || d.faqs.length === 0) return null;
  return (
    <section id="faq" className="mx-auto max-w-[760px] px-6 py-16 sm:py-20">
      <SectionHeading d={d} s={s} kicker="Good to know" title="Frequently asked questions" />
      <div className="mt-9 space-y-3">
        {d.faqs.map((f) => (
          <details key={f.q} className="group px-6 py-1" style={{ background: s.cardBg, borderRadius: s.radius, border: `1px solid ${s.line}` }}>
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-bold">
              {f.q}
              <span className="ml-4 shrink-0 text-[18px] transition-transform group-open:rotate-45" style={{ color: d.brand }}>+</span>
            </summary>
            <p className="pb-5 text-[14px] leading-relaxed" style={MUTED}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBanner({ d, s }: { d: SiteData; s: SiteSkin }) {
  return (
    <section className="mx-auto max-w-[1080px] px-6 pb-16 sm:pb-20">
      <div className="px-8 py-12 text-center text-white sm:py-16" style={{ background: d.brand, borderRadius: s.radius }}>
        <h2 className={`text-[28px] leading-tight sm:text-[34px] ${font(s)} ${s.serif ? "font-medium" : "font-extrabold"}`}>Your first class is waiting</h2>
        <p className="mx-auto mt-3 max-w-[420px] text-[14.5px] opacity-90">See this week&apos;s schedule and reserve your spot in under a minute.</p>
        <a href={d.bookHref} className="mt-7 inline-block rounded-full bg-white px-8 py-3.5 text-[14px] font-bold" style={{ color: d.brand }}>Book a Class</a>
      </div>
    </section>
  );
}

export function SocialLinks({ d, className = "" }: { d: SiteData; className?: string }) {
  const links = [
    d.instagram && { label: `@${d.instagram}`, href: `https://instagram.com/${d.instagram.replace(/^@/, "")}` },
    d.facebook && { label: "Facebook", href: d.facebook.startsWith("http") ? d.facebook : `https://facebook.com/${d.facebook}` },
    d.tiktok && { label: "TikTok", href: `https://tiktok.com/@${d.tiktok.replace(/^@/, "")}` },
  ].filter(Boolean) as { label: string; href: string }[];
  if (links.length === 0) return null;
  return (
    <p className={className}>
      {links.map((l, i) => (
        <span key={l.href}>{i > 0 && " · "}<a className="underline underline-offset-4" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></span>
      ))}
    </p>
  );
}
