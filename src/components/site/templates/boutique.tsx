import React from "react";
import type { SiteData, SiteSkin } from "@/components/site/types";
import { AboutSection, ClassesShowcase, TeamSection, Testimonials, FaqSection, CtaBanner, SocialLinks } from "@/components/site/sections";

const skin: SiteSkin = { bg: "#FAF5EE", bg2: "#F4EDE2", fg: "#2A241D", line: "#2A241D14", cardBg: "#FFFFFF", serif: true, radius: "24px", dark: false };

// Boutique — warm cream, serif editorial, overlapping photo cards.
export function Boutique(d: SiteData) {
  return (
    <div className="min-h-screen" style={{ background: "#FAF5EE", color: "#2A241D" }}>
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-6">
        <div className="font-serif text-[22px] font-semibold tracking-tight">{d.name}</div>
        <a href={d.bookHref} className="rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: d.brand }}>Book a Class</a>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-[1080px] px-6 pb-20 pt-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: d.brand }}>Pilates studio</div>
            <h1 className="mt-4 font-serif text-[44px] font-medium leading-[1.08] tracking-tight sm:text-[56px]">{d.tagline || `Welcome to ${d.name}`}</h1>
            {d.about && <p className="mt-6 max-w-[440px] text-[15.5px] leading-relaxed opacity-75">{d.about}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={d.bookHref} className="rounded-full px-7 py-3.5 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
              <a href="#visit" className="rounded-full border px-7 py-3.5 text-[14px] font-bold" style={{ borderColor: "#2A241D33" }}>Visit us</a>
            </div>
          </div>
          <div className="relative">
            <img src={d.hero} alt={d.name} className="aspect-[4/5] w-full rounded-[28px] object-cover shadow-2xl" />
            {d.gallery[0] && <img src={d.gallery[0]} alt="" className="absolute -bottom-8 -left-8 hidden w-[45%] rounded-2xl border-8 object-cover shadow-xl md:block" style={{ borderColor: "#FAF5EE", aspectRatio: "1" }} />}
          </div>
        </div>
      </header>

      {(() => {
        const blocks: Record<string, React.ReactNode> = {
          about: <AboutSection d={d} s={skin} />,
          classes: <ClassesShowcase d={d} s={skin} />,
          schedule: (<>{/* This week */}
      {d.enabled.schedule && d.sessions.length > 0 && (
        <section className="border-y" style={{ borderColor: "#2A241D14", background: "#F4EDE2" }}>
          <div className="mx-auto max-w-[1080px] px-6 py-16">
            <h2 className="font-serif text-[30px] font-medium">This week at the studio</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {d.sessions.slice(0, 4).map((s) => (
                <a key={s.id} href={d.bookHref} className="rounded-2xl bg-white/70 p-5 transition-transform hover:-translate-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-widest opacity-50">{s.day}</div>
                  <div className="mt-1 font-serif text-[19px] font-medium">{s.name}</div>
                  <div className="mt-1 text-[13px] opacity-70">{s.time}{s.instructor ? ` · ${s.instructor}` : ""}</div>
                  <div className="mt-3 text-[12.5px] font-bold" style={{ color: d.brand }}>Reserve →</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}</>),
          team: <TeamSection d={d} s={skin} />,
          pricing: (<>{/* Packages */}
      {d.enabled.pricing && d.packages.length > 0 && (
        <section className="mx-auto max-w-[1080px] px-6 py-16">
          <h2 className="text-center font-serif text-[30px] font-medium">Packages</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {d.packages.slice(0, 3).map((p) => (
              <div key={p.name} className="rounded-[24px] border bg-white p-7 text-center" style={{ borderColor: "#2A241D14" }}>
                <div className="font-serif text-[19px] font-medium">{p.name}</div>
                <div className="mt-3 font-serif text-[34px]" style={{ color: d.brand }}>{p.price}</div>
                <div className="mt-1 text-[12.5px] opacity-60">{p.credits} classes · valid {p.validityDays} days</div>
                <a href={d.bookHref} className="mt-5 inline-block rounded-full border px-6 py-2.5 text-[13px] font-bold" style={{ borderColor: d.brand, color: d.brand }}>Get started</a>
              </div>
            ))}
          </div>
        </section>
      )}</>),
          testimonials: <Testimonials d={d} s={skin} />,
          gallery: (<>{/* Gallery */}
      {d.enabled.gallery && (
        <section className="mx-auto max-w-[1080px] px-6 py-16">
          <div className="grid grid-cols-3 gap-3">
            {d.gallery.slice(0, 3).map((g, i) => (
              <img key={g} src={g} alt="" loading="lazy" className={`w-full rounded-2xl object-cover ${i === 1 ? "mt-6" : ""}`} style={{ aspectRatio: "3/4" }} />
            ))}
          </div>
        </section>
      )}</>),
          faq: <FaqSection d={d} s={skin} />,
        };
        return d.order.map((id) => <React.Fragment key={id}>{blocks[id]}</React.Fragment>);
      })()}
      <CtaBanner d={d} s={skin} />

      {/* Contact + map */}
      <footer id="visit" className="border-t" style={{ borderColor: "#2A241D14", background: "#2A241D", color: "#FAF5EE" }}>
        <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-[30px] font-medium">Come move with us</h2>
            <div className="mt-6 space-y-2.5 text-[14.5px] opacity-85">
              {d.address && <p>📍 {d.address}</p>}
              {d.phone && <p>📞 {d.phone}</p>}
              {d.hours && <p>🕐 {d.hours}</p>}
              <SocialLinks d={d} />
            </div>
            <a href={d.bookHref} className="mt-8 inline-block rounded-full px-7 py-3.5 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
            <p className="mt-10 text-[11px] uppercase tracking-widest opacity-40">Powered by StudioNexis</p>
          </div>
          {d.mapSrc && <iframe src={d.mapSrc} className="h-[300px] w-full rounded-2xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />}
        </div>
      </footer>
    </div>
  );
}
