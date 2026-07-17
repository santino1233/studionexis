import React from "react";
import type { SiteData, SiteSkin } from "@/components/site/types";
import { AboutSection, ClassesShowcase, TeamSection, Testimonials, FaqSection, CtaBanner, SocialLinks } from "@/components/site/sections";

const skin: SiteSkin = { bg: "#F2F4EF", bg2: "#FFFFFFb3", fg: "#2B322B", line: "#2B322B14", cardBg: "#FFFFFF", serif: false, radius: "24px", dark: false };

// Serene — soft sage & stone, airy rounded shapes, calm and natural.
export function Serene(d: SiteData) {
  return (
    <div className="min-h-screen" style={{ background: "#F2F4EF", color: "#2B322B" }}>
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-6">
        <div className="font-display text-[18px] font-extrabold tracking-tight">{d.name}</div>
        <a href={d.bookHref} className="rounded-full px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
      </nav>

      {/* Hero — soft split with arch photo */}
      <header className="mx-auto max-w-[1080px] px-6 pb-20 pt-6">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="inline-block rounded-full px-4 py-1.5 text-[11.5px] font-bold" style={{ background: `${d.brand}1f`, color: d.brand }}>🌿 A calmer way to move</div>
            <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.06] tracking-tight sm:text-[54px]">{d.tagline || `Breathe. Move. ${d.name}.`}</h1>
            {d.about && <p className="mt-6 max-w-[460px] text-[15.5px] leading-relaxed opacity-70">{d.about}</p>}
            <div className="mt-8 flex gap-3">
              <a href={d.bookHref} className="rounded-full px-7 py-3.5 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
              <a href="#find-us" className="rounded-full bg-white px-7 py-3.5 text-[14px] font-bold shadow-sm">Find us</a>
            </div>
          </div>
          <img src={d.hero} alt={d.name} className="aspect-[3/4] w-full object-cover shadow-xl" style={{ borderRadius: "200px 200px 28px 28px" }} />
        </div>
      </header>

      {(() => {
        const blocks: Record<string, React.ReactNode> = {
          about: <AboutSection d={d} s={skin} />,
          classes: <ClassesShowcase d={d} s={skin} />,
          schedule: (<>{/* Upcoming */}
      {d.enabled.schedule && d.sessions.length > 0 && (
        <section className="bg-white/70">
          <div className="mx-auto max-w-[1080px] px-6 py-16">
            <h2 className="text-center font-display text-[28px] font-extrabold tracking-tight">Upcoming classes</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {d.sessions.slice(0, 4).map((s) => (
                <a key={s.id} href={d.bookHref} className="rounded-3xl bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1">
                  <div className="mx-auto grid size-11 place-items-center rounded-full text-[15px] font-extrabold text-white" style={{ background: s.color }}>{s.name[0]}</div>
                  <div className="mt-3 text-[15px] font-bold">{s.name}</div>
                  <div className="mt-1 text-[12.5px] opacity-60">{s.day} · {s.time}</div>
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
          <h2 className="text-center font-display text-[28px] font-extrabold tracking-tight">Gentle on your wallet too</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {d.packages.slice(0, 3).map((p) => (
              <div key={p.name} className="rounded-3xl bg-white p-7 text-center shadow-sm">
                <div className="text-[15px] font-bold">{p.name}</div>
                <div className="mt-3 font-display text-[32px] font-extrabold" style={{ color: d.brand }}>{p.price}</div>
                <div className="mt-1 text-[12.5px] opacity-60">{p.credits} classes · valid {p.validityDays} days</div>
                <a href={d.bookHref} className="mt-5 inline-block rounded-full px-6 py-2.5 text-[13px] font-bold text-white" style={{ background: "#2B322B" }}>Start today</a>
              </div>
            ))}
          </div>
        </section>
      )}</>),
          testimonials: <Testimonials d={d} s={skin} />,
          gallery: (<>{/* Gallery */}
      {d.enabled.gallery && (
        <section className="mx-auto max-w-[1080px] px-6 py-16">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {d.gallery.slice(0, 4).map((g, i) => (
              <img key={g} src={g} alt="" loading="lazy" className="w-full object-cover shadow-sm" style={{ aspectRatio: "3/4", borderRadius: i % 2 ? "28px" : "120px 120px 28px 28px" }} />
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
      <footer id="find-us" className="rounded-t-[48px] bg-white">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[28px] font-extrabold tracking-tight">Find your calm</h2>
            <div className="mt-6 space-y-2.5 text-[14.5px] opacity-75">
              {d.address && <p>📍 {d.address}</p>}
              {d.phone && <p>📞 {d.phone}</p>}
              {d.hours && <p>🕐 {d.hours}</p>}
              <SocialLinks d={d} />
            </div>
            <a href={d.bookHref} className="mt-8 inline-block rounded-full px-7 py-3.5 text-[14px] font-bold text-white" style={{ background: d.brand }}>Book a Class</a>
            <p className="mt-10 text-[11.5px] opacity-40">Powered by StudioNexis</p>
          </div>
          {d.mapSrc && <iframe src={d.mapSrc} className="h-[300px] w-full rounded-3xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />}
        </div>
      </footer>
    </div>
  );
}
