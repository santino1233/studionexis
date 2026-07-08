import type { SiteData } from "@/components/site/types";

// Bold — brand-color-drenched, oversized display type, high energy.
export function Bold(d: SiteData) {
  return (
    <div className="min-h-screen bg-[#17181C] text-white">
      <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-6">
        <div className="font-display text-[19px] font-extrabold uppercase tracking-tight">{d.name}</div>
        <a href={d.bookHref} className="rounded-xl px-5 py-2.5 text-[13px] font-extrabold uppercase text-black" style={{ background: d.brand }}>Book now</a>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden" style={{ background: d.brand }}>
        <div className="mx-auto grid max-w-[1100px] items-stretch gap-0 px-6 md:grid-cols-2">
          <div className="flex flex-col justify-center py-16 pr-4">
            <h1 className="font-display text-[54px] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-black sm:text-[76px]">
              {d.tagline || `Move with ${d.name}`}
            </h1>
            {d.about && <p className="mt-6 max-w-[440px] text-[15px] font-medium leading-relaxed text-black/75">{d.about}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={d.bookHref} className="rounded-xl bg-black px-8 py-4 text-[14px] font-extrabold uppercase text-white transition-transform hover:-translate-y-0.5">Book a Class →</a>
              <a href="#prices" className="rounded-xl border-2 border-black px-8 py-4 text-[14px] font-extrabold uppercase text-black">Prices</a>
            </div>
          </div>
          <img src={d.hero} alt={d.name} className="min-h-[360px] w-full object-cover md:-mr-6" />
        </div>
      </header>

      {/* Marquee-ish strip */}
      <div className="overflow-hidden border-y border-white/10 py-4">
        <div className="whitespace-nowrap font-display text-[15px] font-extrabold uppercase tracking-[0.2em] text-white/40">
          {Array.from({ length: 6 }, () => `${d.name} · Book a class · `).join("")}
        </div>
      </div>

      {/* Classes */}
      {d.sessions.length > 0 && (
        <section className="mx-auto max-w-[1100px] px-6 py-16">
          <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight">This week</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {d.sessions.slice(0, 4).map((s) => (
              <a key={s.id} href={d.bookHref} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                <div>
                  <div className="font-display text-[22px] font-extrabold">{s.name}</div>
                  <div className="mt-1 text-[13px] text-white/50">{s.day} · {s.time}{s.instructor ? ` · ${s.instructor}` : ""}</div>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full text-[18px] font-extrabold text-black transition-transform group-hover:rotate-45" style={{ background: d.brand }}>→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Packages */}
      {d.packages.length > 0 && (
        <section id="prices" className="mx-auto max-w-[1100px] px-6 pb-16">
          <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight">Packs</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {d.packages.slice(0, 3).map((p, i) => (
              <div key={p.name} className={`rounded-3xl p-7 ${i === 1 ? "text-black" : "border border-white/10 bg-white/5"}`} style={i === 1 ? { background: d.brand } : undefined}>
                <div className="font-display text-[17px] font-extrabold uppercase">{p.name}</div>
                <div className="mt-4 font-display text-[40px] font-extrabold tracking-tight">{p.price}</div>
                <div className={`mt-1 text-[12.5px] ${i === 1 ? "text-black/60" : "text-white/50"}`}>{p.credits} classes · {p.validityDays} days</div>
                <a href={d.bookHref} className={`mt-6 inline-block rounded-xl px-6 py-3 text-[13px] font-extrabold uppercase ${i === 1 ? "bg-black text-white" : "text-black"}`} style={i === 1 ? undefined : { background: d.brand }}>Grab it</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="mx-auto grid max-w-[1100px] grid-cols-2 gap-3 px-6 pb-16 md:grid-cols-4">
        {d.gallery.slice(0, 4).map((g) => (
          <img key={g} src={g} alt="" loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
        ))}
      </section>

      {/* Contact + map */}
      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight">Pull up</h2>
            <div className="mt-6 space-y-2.5 text-[14.5px] text-white/70">
              {d.address && <p>📍 {d.address}</p>}
              {d.phone && <p>📞 {d.phone}</p>}
              {d.hours && <p>🕐 {d.hours}</p>}
              {d.instagram && <p>◎ <a className="underline underline-offset-4" href={`https://instagram.com/${d.instagram}`}>@{d.instagram}</a></p>}
            </div>
            <a href={d.bookHref} className="mt-8 inline-block rounded-xl px-8 py-4 text-[14px] font-extrabold uppercase text-black" style={{ background: d.brand }}>Book a Class</a>
            <p className="mt-10 text-[11px] uppercase tracking-widest text-white/25">Powered by StudioNexis</p>
          </div>
          {d.mapSrc && <iframe src={d.mapSrc} className="h-[300px] w-full rounded-2xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />}
        </div>
      </footer>
    </div>
  );
}
