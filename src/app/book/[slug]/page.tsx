import Link from "next/link";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { moneyFormatter } from "@/lib/tenant";
import { CustomerNav } from "@/components/customer/nav";
import { difficultyLabel } from "@/lib/class-config";
import { studioStripeEnabled } from "@/lib/stripe";
import MuscleMap from "@/components/muscle-map/MuscleMap";

export const dynamic = "force-dynamic";
const diffTone: Record<string, string> = {
  BEGINNER: "bg-green-wash text-green",
  INTERMEDIATE: "bg-brand-wash text-brand",
  ADVANCED: "bg-rose/10 text-rose",
};

export default async function BookPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; lvl?: string; ok?: string; err?: string; s?: string; k?: string; sd?: string; ref?: string }>;
}) {
  const { slug } = await params;
  const { d, lvl, ok, err, s: errSession, k, sd, ref } = await searchParams;
  const kind = k === "private" ? "PRIVATE" : "GROUP";
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const fmt = moneyFormatter(tenant.currency);
  const cs = await getCustomerSession();
  const authed = cs && cs.tenantId === tenant.id;

  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const days = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(new Date(`${todayKey}T00:00:00Z`).getTime() + i * 86400_000);
    return dt.toISOString().slice(0, 10);
  });
  const selected = d && days.includes(d) ? d : todayKey;

  const all = await db.classSession.findMany({
    where: { tenantId: tenant.id, status: "SCHEDULED", isPublic: true, startsAt: { gt: new Date(), lt: new Date(Date.now() + 15 * 86400_000) } },
    include: { classType: true, instructor: true, bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
    orderBy: { startsAt: "asc" },
  });
  const forDay = (day: string) => all.filter((x) => x.classType.kind === kind && dayKeyInTz(x.startsAt, tenant.timezone) === day && (!lvl || x.classType.difficulty === lvl));
  let list = forDay(selected);
  let showingDay = selected;
  let rolled = false;
  if (list.length === 0 && selected === todayKey && !d) {
    const next = days.find((day) => forDay(day).length > 0);
    if (next && next !== todayKey) { showingDay = next; list = forDay(next); rolled = true; }
  }

  const creditRows = authed
    ? await db.clientPackage.findMany({
        where: { tenantId: tenant.id, clientId: cs!.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        include: { package: { select: { kind: true } } },
      })
    : [];
  const creditSum = creditRows.filter((p) => p.package.kind === kind).reduce((n, p) => n + p.creditsLeft, 0);
  const stripeOn = studioStripeEnabled(tenant);
  const payAtStudioOk = ((tenant.policies ?? {}) as { payAtStudio?: boolean }).payAtStudio !== false;
  // Upsell package for the sidebar (Wave 14 V6)
  const upsellCfg = ((tenant.policies ?? {}) as { upsell?: { groupPackageId?: string | null; privatePackageId?: string | null; hideIfActive?: boolean } }).upsell;
  // Slide-over class details (old-system View Details, same page)
  const sdSession = sd ? all.find((x) => x.id === sd) ?? null : null;
  const sdSpots = sdSession ? sdSession.capacity - sdSession.bookings.reduce((n, b) => n + b.qty, 0) : 0;
  const upsellId = sdSession ? (sdSession.classType.kind === "PRIVATE" ? upsellCfg?.privatePackageId : upsellCfg?.groupPackageId) : null;
  const hasActiveOfKind = sdSession ? creditRows.some((p) => p.package.kind === sdSession.classType.kind) : false;
  const upsellPkg = upsellId && sdSession && !(upsellCfg?.hideIfActive !== false && authed && hasActiveOfKind)
    ? await db.package.findFirst({ where: { id: upsellId, tenantId: tenant.id, active: true } })
    : null;
  const qsHere = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = { d, lvl, k: k === "private" ? "private" : undefined, ...over };
    for (const [kk, vv] of Object.entries(merged)) if (vv) p.set(kk, vv);
    const str = p.toString();
    return str ? `/book/${slug}?${str}` : `/book/${slug}`;
  };

  const dayCounts = new Map(days.map((day) => [day, all.filter((x) => dayKeyInTz(x.startsAt, tenant.timezone) === day).length]));
  const showLabel = showingDay === todayKey
    ? "Today"
    : new Date(`${showingDay}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const input = "h-10 w-full rounded-[9px] border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-muted focus:ring-4";

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="book" brand={brand} />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">Book a Class</h1>
            <p className="mt-1 text-sm text-muted">
              🕐 All class times are shown in {tenant.timezone.split("/").pop()!.replace("_", " ")} time ({(() => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tenant.timezone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "local"; } catch { return "local"; } })()})
            </p>
          </div>
          {authed && (
            <div className="rounded-2xl border border-line-2 bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted"><Ticket className="size-3.5" style={{ color: brand }} /> Your credits</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[24px] font-extrabold text-ink">{creditSum}</span>
                <span className="text-[12px] text-muted">{kind === "PRIVATE" ? "private credits" : "group credits"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Group / Private tabs (old-system style) */}
        <div className="mt-6 flex gap-2">
          {([["group", "👥 Group Classes"], ["private", "🤍 Private Sessions"]] as const).map(([kk, label]) => {
            const active = (k === "private" ? "private" : "group") === kk;
            return (
              <Link key={kk} href={qsHere({ k: kk === "group" ? undefined : kk, sd: undefined })}
                className={`rounded-full border px-5 py-2.5 text-[13.5px] font-bold transition-colors ${active ? "border-transparent text-white" : "border-line-2 bg-surface text-ink-2 hover:text-ink"}`}
                style={active ? { background: brand } : undefined}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Day strip */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => {
            const dt = new Date(`${day}T12:00:00Z`);
            const isSel = day === showingDay;
            const isToday = day === todayKey;
            const has = (dayCounts.get(day) ?? 0) > 0;
            return (
              <Link
                key={day}
                href={qsHere({ d: day, sd: undefined })}
                className={`flex w-[72px] shrink-0 flex-col items-center rounded-2xl border px-2 py-3 transition-colors ${isSel ? "border-transparent text-white" : "border-line-2 bg-surface text-ink hover:border-line"}`}
                style={isSel ? { background: brand } : undefined}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSel ? "text-white/80" : "text-muted"}`}>
                  {isToday ? "Today" : dt.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="font-display text-[20px] font-extrabold leading-tight">{dt.getUTCDate()}</span>
                <span className={`text-[10px] font-semibold ${isSel ? "text-white/80" : "text-muted"}`}>{dt.toLocaleDateString("en-US", { month: "short" })}</span>
                {has && !isSel && <span className="mt-1 size-1.5 rounded-full" style={{ background: brand }} />}
              </Link>
            );
          })}
        </div>

        {/* Level filter — from the difficulties this studio actually uses */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[["", "All Classes"] as const, ...[...new Set(all.map((x) => x.classType.difficulty))].sort().map((v) => [v, difficultyLabel(v)] as const)].map(([v, label]) => {
            const active = (lvl ?? "") === v;
            return (
              <Link key={v} href={qsHere({ d: showingDay, lvl: v || undefined, sd: undefined })}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${active ? "border-transparent text-white" : "border-line-2 bg-surface text-ink-2 hover:text-ink"}`}
                style={active ? { background: "#17181C" } : undefined}>
                {label}
              </Link>
            );
          })}
        </div>

        {ok === "booked" && ref ? (
          <div className="mt-6 rounded-3xl border border-line-2 bg-surface p-8 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-wash text-[26px]">✓</div>
            <h2 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-ink">You&apos;re All Set!</h2>
            <p className="mt-1 text-[14px] text-muted">Your class has been booked successfully.</p>
            <div className="mx-auto mt-5 inline-block rounded-xl bg-raised px-6 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Booking reference</div>
              <div className="mt-0.5 font-mono text-[17px] font-bold tracking-wider text-ink">{ref}</div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link href={`/book/${slug}/bookings`} className="rounded-xl px-6 py-3 text-[13.5px] font-bold text-white" style={{ background: brand }}>📅 View My Bookings</Link>
              <Link href={`/book/${slug}`} className="rounded-xl border border-line-2 bg-surface px-6 py-3 text-[13.5px] font-bold text-ink-2 hover:text-ink">Book another class</Link>
            </div>
            <p className="mt-6 text-[13px] font-semibold" style={{ color: brand }}>🤍 We can&apos;t wait to see you!</p>
          </div>
        ) : ok === "booked" ? (
          <div className="mt-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">You&apos;re booked! See you in class. 🎉</div>
        ) : null}
        {ok === "waitlist" && <div className="mt-5 rounded-2xl border px-5 py-4 text-[14px] font-bold" style={{ borderColor: `${brand}33`, background: `${brand}14`, color: brand }}>That class is full — you&apos;re on the waitlist.</div>}
        {err && <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">{err === "already" ? "You're already on that class." : err === "missing" ? "Please give your name and a phone or email." : err === "full" ? "The studio can't take online bookings right now — please contact them directly." : err === "pay" ? "This studio books with class credits — grab a package first." : "That didn't work — try again."}</div>}
        {rolled && (
          <div className="mt-5 rounded-2xl px-5 py-3.5 text-[13.5px] font-semibold" style={{ background: `${brand}14`, color: brand }}>
            🌿 No more classes today — here&apos;s the next available day.
          </div>
        )}

        <div className="mb-3 mt-7 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
          {rolled ? `${showLabel}` : showLabel} · {new Date(`${showingDay}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>

        <div className="space-y-3">
          {list.map((x) => {
            const spotsLeft = x.capacity - x.bookings.reduce((n, b) => n + b.qty, 0);
            const open = errSession === x.id;
            return (
              <div key={x.id} className="overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center gap-4 border-l-4 p-5" style={{ borderColor: x.classType.color }}>
                  <div className="w-[86px] text-center">
                    <div className="font-display text-[22px] font-extrabold leading-tight text-ink">{timeInTz(x.startsAt, tenant.timezone).replace(/ (AM|PM)/, "")}</div>
                    <div className="text-[11px] font-bold text-muted">{timeInTz(x.startsAt, tenant.timezone).includes("PM") ? "PM" : "AM"} · {x.classType.durationMin} min</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/book/${slug}/class/${x.id}`} className="text-[16px] font-bold text-ink hover:underline">{x.classType.name}</Link>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${diffTone[x.classType.difficulty] ?? "bg-line-2 text-ink-2"}`}>
                        {difficultyLabel(x.classType.difficulty)}
                      </span>
                      {x.classType.format && <span className="rounded-full bg-line-2 px-2.5 py-0.5 text-[11px] font-bold text-ink-2">{x.classType.format}</span>}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {x.instructor ? `${x.instructor.name} · ` : ""}{fmt.format(Number(x.classType.price))}{x.location ? ` · ${x.location}` : ""}
                    </div>
                    {x.classType.description && <p className="mt-1 max-w-[520px] text-[12px] leading-relaxed text-muted">{x.classType.description}</p>}
                    <Link href={qsHere({ sd: x.id })} className="mt-1 inline-block text-[12px] font-bold hover:underline" style={{ color: brand }}>View details →</Link>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[12px] font-bold ${spotsLeft > 0 ? (spotsLeft <= 2 ? "text-brand" : "text-green") : "text-muted"}`}>
                      {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : "Full — waitlist"}
                    </span>
                    {authed ? (
                      <form method="post" action="/api/public/book">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="sessionId" value={x.id} />
                        <button className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: spotsLeft > 0 ? "#17181C" : brand }}>
                          {spotsLeft > 0 ? "Book now" : "Join waitlist"}
                        </button>
                      </form>
                    ) : (
                      <Link href={qsHere({ sd: x.id })} className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: "#17181C" }}>
                        {spotsLeft > 0 ? "Book now" : "Join waitlist"}
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
          {list.length === 0 && (
            <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
              {all.length === 0
                ? "No classes scheduled yet — check back soon! ✨"
                : <>No classes match this day{lvl ? " and level" : ""} — try another.</>}
            </div>
          )}
        </div>

        {sdSession && (() => {
          const ct = sdSession.classType;
          const full = sdSpots <= 0;
          const maxQty = full ? 1 : Math.min(5, sdSpots);
          return (
            <div className="fixed inset-0 z-50">
              <Link href={qsHere({ sd: undefined })} className="absolute inset-0 bg-black/45" aria-label="Close" />
              <aside className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col overflow-y-auto bg-surface shadow-2xl">
                <div className="relative shrink-0 px-6 py-8 text-white" style={{ background: ct.heroImage ? undefined : `linear-gradient(125deg, ${ct.color}, ${ct.color}99)` }}>
                  {ct.heroImage && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ct.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50" />
                    </>
                  )}
                  <div className="relative">
                    <Link href={qsHere({ sd: undefined })} className="absolute -right-2 -top-3 grid size-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">✕</Link>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10.5px] font-bold">{difficultyLabel(ct.difficulty)}</span>
                      {ct.format && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10.5px] font-bold">{ct.format}</span>}
                    </div>
                    <h2 className="mt-2.5 font-display text-[26px] font-extrabold tracking-tight">{ct.name}</h2>
                    <p className="mt-1 text-[13px] font-semibold text-white/90">
                      {sdSession.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "long", month: "long", day: "numeric" })} · {timeInTz(sdSession.startsAt, tenant.timezone)} – {timeInTz(sdSession.endsAt, tenant.timezone)}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-white/75">
                      {sdSession.instructor ? `with ${sdSession.instructor.name} · ` : ""}{fmt.format(Number(ct.price))} / person · {full ? "Full — waitlist open" : `${sdSpots} spot${sdSpots === 1 ? "" : "s"} left`}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-5 p-6">
                  {ct.description && <p className="text-[13.5px] leading-relaxed text-ink-2">{ct.description}</p>}
                  {ct.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ct.benefits.map((bn) => <span key={bn} className="rounded-full bg-line-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">✦ {bn}</span>)}
                    </div>
                  )}
                  {ct.muscles.length > 0 && (
                    <div className="rounded-2xl border border-line-2 p-4">
                      <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Muscle focus</div>
                      <MuscleMap initial={ct.muscles} readonly />
                    </div>
                  )}

                  {upsellPkg && (
                    <div className="rounded-2xl border p-4" style={{ borderColor: `${brand}44`, background: `${brand}0d` }}>
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: brand }}>💡 Save with a package</div>
                      <div className="mt-1 text-[13.5px] font-bold text-ink">{upsellPkg.name} — {fmt.format(Number(upsellPkg.price))}{upsellPkg.interval === "month" ? "/mo" : upsellPkg.interval === "year" ? "/yr" : ""} for {upsellPkg.credits} classes</div>
                      <div className="text-[11.5px] text-muted">≈ {fmt.format(Number(upsellPkg.price) / Math.max(1, upsellPkg.credits))} per class instead of {fmt.format(Number(ct.price))}</div>
                      <Link href={`/book/${slug}/packages`} className="mt-2.5 inline-block rounded-lg px-3.5 py-2 text-[12px] font-bold text-white" style={{ background: brand }}>Get the package →</Link>
                    </div>
                  )}
                  <form method="post" action="/api/public/book" className="space-y-3.5 border-t border-line-2 pt-5">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="sessionId" value={sdSession.id} />
                    <input type="hidden" name="from" value={qsHere({ sd: sdSession.id })} />
                    {!full && (
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">How many people?</label>
                        <select name="qty" className={input} defaultValue="1">
                          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "Just me" : `${n} people`}</option>)}
                        </select>
                      </div>
                    )}
                    {!authed && (
                      <div className="space-y-2.5">
                        <input name="name" required placeholder="Your name" className={input} />
                        <input name="phone" placeholder="Phone" className={input} />
                        <input name="email" type="email" placeholder="Email" className={input} />
                        <p className="text-[11.5px] text-muted">Have an account? <Link href={`/book/${slug}/account`} className="font-bold" style={{ color: brand }}>Sign in</Link> to use your credits.</p>
                      </div>
                    )}
                    {!full && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">How will you pay?</label>
                        {authed && creditSum > 0 && (
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-2 px-3.5 py-2.5 text-[13px] font-semibold">
                            <input type="radio" name="pay" value="credit" defaultChecked style={{ accentColor: brand }} /> Use my credits ({creditSum} left)
                          </label>
                        )}
                        {payAtStudioOk && (
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-2 px-3.5 py-2.5 text-[13px] font-semibold">
                            <input type="radio" name="pay" value="at_studio" defaultChecked={!authed || creditSum === 0} style={{ accentColor: brand }} /> Pay at the studio
                          </label>
                        )}
                        {stripeOn && authed && (
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-2 px-3.5 py-2.5 text-[13px] font-semibold">
                            <input type="radio" name="pay" value="online" style={{ accentColor: brand }} /> Pay online in full (card)
                          </label>
                        )}
                      </div>
                    )}
                    <button className="w-full rounded-xl py-3 text-[14px] font-bold text-white hover:opacity-90" style={{ background: full ? brand : "#17181C" }}>
                      {full ? "Join the waitlist" : "Confirm booking"}
                    </button>
                    <Link href={`/book/${slug}/class/${sdSession.id}`} className="block text-center text-[11.5px] font-bold text-muted hover:text-ink">Open full page ↗</Link>
                  </form>
                </div>
              </aside>
            </div>
          );
        })()}

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
