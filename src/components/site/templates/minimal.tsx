import React from "react";
import type { SiteData, SiteSkin } from "@/components/site/types";
import { AboutSection, ClassesShowcase, TeamSection, Testimonials, FaqSection, CtaBanner, SocialLinks } from "@/components/site/sections";

const skin: SiteSkin = { bg: "#FFFFFF", bg2: "#F6F6F4", fg: "#111113", line: "#0000001a", cardBg: "#FFFFFF", serif: false, radius: "0px", dark: false };

// Minimal — white, oversized sans type, hairline rules, one accent.
export function Minimal(d: SiteData) {
  return (
    <div className="min-h-screen bg-white text-[#111113]">
      <nav className="mx-auto flex max-w-[1040px] items-center justify-between border-b border-black/10 px-6 py-5">
        <div className="font-display text-[17px] font-extrabold tracking-tight">{d.name}</div>
        <a href={d.bookHref} className="text-[13px] font-bold underline decoration-2 underline-offset-4" style={{ textDecorationColor: d.brand }}>Book a Class</a>
      </nav>

      <header className="mx-auto max-w-[1040px] px-6 pb-16 pt-14">
        <h1 className="font-display text-[52px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-[84px]">
          {d.tagline || `Welcome to ${d.name}.`}
        </h1>
        {d.about && <p className="mt-8 max-w-[520px] text-[16px] leading-relaxed text-black/60">{d.about}</p>}
        <a href={d.bookHref} className="mt-10 inline-block rounded-none px-8 py-4 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class →</a>
        <img src={d.hero} alt={d.name} className="mt-14 aspect-[21/9] w-full object-cover" />
      </header>

      {(() => {
        const blocks: Record<string, React.ReactNode> = {
          about: <AboutSection d={d} s={skin} />,
          classes: <ClassesShowcase d={d} s={skin} />,
          schedule: (<>{/* This week */}
      {d.enabled.schedule && d.sessions.length > 0 && (
        <section className="mx-auto max-w-[1040px] border-t border-black/10 px-6 py-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/40">This week</div>
          <div className="mt-6">
            {d.sessions.slice(0, 5).map((s) => (
              <a key={s.id} href={d.bookHref} className="group flex items-baseline justify-between gap-4 border-b border-black/10 py-4">
                <span className="font-display text-[22px] font-extrabold tracking-tight transition-colors" style={{ color: undefined }}>
                  <span className="group-hover:hidden">{s.name}</span>
                  <span className="hidden group-hover:inline" style={{ color: d.brand }}>{s.name} →</span>
                </span>
                <span className="shrink-0 text-[13px] text-black/50">{s.day} · {s.time}</span>
              </a>
            ))}
          </div>
        </section>
      )}</>),
          team: <TeamSection d={d} s={skin} />,
          pricing: (<>{/* Packages */}
      {d.enabled.pricing && d.packages.length > 0 && (
        <section className="mx-auto max-w-[1040px] px-6 py-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/40">Pricing</div>
          <div className="mt-6 grid gap-px bg-black/10 sm:grid-cols-3" style={{ border: "1px solid rgba(0,0,0,.1)" }}>
            {d.packages.slice(0, 3).map((p) => (
              <div key={p.name} className="bg-white p-8">
                <div className="text-[14px] font-bold">{p.name}</div>
                <div className="mt-4 font-display text-[34px] font-extrabold tracking-tight" style={{ color: d.brand }}>{p.price}</div>
                <div className="mt-1 text-[12.5px] text-black/50">{p.credits} classes · {p.validityDays} days</div>
              </div>
            ))}
          </div>
        </section>
      )}</>),
          testimonials: <Testimonials d={d} s={skin} />,
          gallery: (<>{/* Gallery */}
      {d.enabled.gallery && (
        <section className="mx-auto grid max-w-[1040px] grid-cols-3 gap-px px-6 pb-14">
          {d.gallery.slice(0, 3).map((g) => (
            <img key={g} src={g} alt="" loading="lazy" className="aspect-square w-full object-cover" />
          ))}
        </section>
      )}</>),
          faq: <FaqSection d={d} s={skin} />,
        };
        return d.order.map((id) => <React.Fragment key={id}>{blocks[id]}</React.Fragment>);
      })()}
      <CtaBanner d={d} s={skin} />

      {/* Contact + map */}
      <footer className="border-t border-black/10">
        <div className="mx-auto grid max-w-[1040px] gap-10 px-6 py-14 md:grid-cols-2">
          <div>
            <div className="font-display text-[24px] font-extrabold tracking-tight">Visit</div>
            <div className="mt-5 space-y-2 text-[14.5px] text-black/65">
              {d.address && <p>{d.address}</p>}
              {d.phone && <p>{d.phone}</p>}
              {d.hours && <p>{d.hours}</p>}
              <SocialLinks d={d} />
            </div>
            <a href={d.bookHref} className="mt-8 inline-block px-8 py-4 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
            <p className="mt-10 text-[11px] text-black/30">Powered by StudioNexis</p>
          </div>
          {d.mapSrc && <iframe src={d.mapSrc} className="h-[300px] w-full border border-black/10" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />}
        </div>
      </footer>
    </div>
  );
}
