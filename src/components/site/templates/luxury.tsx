import type { SiteData } from "@/components/site/types";

// Luxury — near-black, thin uppercase tracking, gold-leaning accent, full-bleed hero.
export function Luxury(d: SiteData) {
  return (
    <div className="min-h-screen" style={{ background: "#121110", color: "#EFEAE2" }}>
      {/* Full-bleed hero */}
      <header className="relative min-h-[92vh]">
        <img src={d.hero} alt={d.name} className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(18,17,16,.35), rgba(18,17,16,.92))" }} />
        <nav className="relative mx-auto flex max-w-[1100px] items-center justify-between px-6 py-8">
          <div className="text-[15px] font-semibold uppercase tracking-[0.35em]">{d.name}</div>
          <a href={d.bookHref} className="border px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-colors hover:text-black" style={{ borderColor: d.brand, color: d.brand }}>Reserve</a>
        </nav>
        <div className="relative mx-auto flex max-w-[1100px] flex-col items-center px-6 pb-24 pt-[16vh] text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.5em]" style={{ color: d.brand }}>Private · Refined · Yours</div>
          <h1 className="mt-6 max-w-[820px] font-serif text-[46px] font-medium leading-[1.1] sm:text-[64px]">{d.tagline || d.name}</h1>
          {d.about && <p className="mt-7 max-w-[560px] text-[15px] leading-relaxed opacity-70">{d.about}</p>}
          <a href={d.bookHref} className="mt-10 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.3em] text-black" style={{ background: d.brand }}>Book a Class</a>
        </div>
      </header>

      {/* Classes */}
      {d.sessions.length > 0 && (
        <section className="mx-auto max-w-[1100px] px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <h2 className="font-serif text-[32px] font-medium">The Schedule</h2>
            <a href={d.bookHref} className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: d.brand }}>Full schedule →</a>
          </div>
          <div className="divide-y" style={{ borderColor: "#EFEAE21a" }}>
            {d.sessions.slice(0, 5).map((s) => (
              <a key={s.id} href={d.bookHref} className="group flex items-center justify-between gap-4 py-5" style={{ borderColor: "#EFEAE21a" }}>
                <div className="flex items-baseline gap-6">
                  <span className="w-[90px] text-[11px] font-bold uppercase tracking-[0.2em] opacity-50">{s.day}</span>
                  <span className="font-serif text-[20px] transition-colors group-hover:opacity-100" style={{ color: "#EFEAE2" }}>{s.name}</span>
                </div>
                <span className="text-[13px] opacity-60">{s.time}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Gallery strip */}
      <section className="grid grid-cols-2 gap-1 md:grid-cols-4">
        {d.gallery.slice(0, 4).map((g) => (
          <img key={g} src={g} alt="" loading="lazy" className="aspect-square w-full object-cover opacity-80 transition-opacity hover:opacity-100" />
        ))}
      </section>

      {/* Packages */}
      {d.packages.length > 0 && (
        <section className="mx-auto max-w-[1100px] px-6 py-20">
          <h2 className="text-center font-serif text-[32px] font-medium">Memberships</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {d.packages.slice(0, 3).map((p, i) => (
              <div key={p.name} className={`border p-8 text-center ${i === 1 ? "md:-mt-4 md:pb-12" : ""}`} style={{ borderColor: i === 1 ? d.brand : "#EFEAE224" }}>
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">{p.name}</div>
                <div className="mt-5 font-serif text-[38px]" style={{ color: d.brand }}>{p.price}</div>
                <div className="mt-2 text-[12.5px] opacity-55">{p.credits} classes · {p.validityDays} days</div>
                <a href={d.bookHref} className="mt-7 inline-block border px-7 py-3 text-[11px] font-bold uppercase tracking-[0.25em]" style={{ borderColor: d.brand, color: d.brand }}>Select</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact + map */}
      <footer className="border-t px-6 py-20" style={{ borderColor: "#EFEAE21a" }}>
        <div className="mx-auto grid max-w-[1100px] gap-12 md:grid-cols-2">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.35em]">{d.name}</div>
            <div className="mt-8 space-y-3 text-[14px] opacity-75">
              {d.address && <p>{d.address}</p>}
              {d.phone && <p>{d.phone}</p>}
              {d.hours && <p>{d.hours}</p>}
              {d.instagram && <p><a className="underline underline-offset-4" href={`https://instagram.com/${d.instagram}`}>@{d.instagram}</a></p>}
            </div>
            <a href={d.bookHref} className="mt-10 inline-block px-9 py-3.5 text-[11px] font-bold uppercase tracking-[0.3em] text-black" style={{ background: d.brand }}>Book a Class</a>
            <p className="mt-12 text-[10px] uppercase tracking-[0.3em] opacity-30">Powered by StudioNexis</p>
          </div>
          {d.mapSrc && <iframe src={d.mapSrc} className="h-[320px] w-full border-0 grayscale" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />}
        </div>
      </footer>
    </div>
  );
}
