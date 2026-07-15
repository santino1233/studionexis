import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, User as UserIcon, Ticket, Dumbbell } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { timeInTz } from "@/lib/tz";
import { moneyFormatter } from "@/lib/tenant";
import { CustomerNav } from "@/components/customer/nav";
import { difficultyLabel } from "@/lib/class-config";
import MuscleMap from "@/components/muscle-map/MuscleMap";
import { studioStripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const diffTone: Record<string, string> = {
  BEGINNER: "bg-green-wash text-green",
  INTERMEDIATE: "bg-brand-wash text-brand",
  ADVANCED: "bg-rose/10 text-rose",
};
const ERRORS: Record<string, string> = {
  spots: "Not enough spots left for that group size — try fewer people.",
  credits: "You don't have enough class credits for that — grab a package first.",
  pay: "This studio doesn't take pay-at-studio bookings — use your class credits.",
  online: "Online payment is coming soon — pick another option for now.",
  "online-login": "Sign in to pay online — or pick another option.",
  cancelled: "Payment cancelled — no charge was made, and your spot wasn't booked.",
  already: "You're already on this class.",
  missing: "Please give your name and a phone or email.",
  failed: "That didn't work — try again.",
};

export default async function ClassDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { slug, id } = await params;
  const { err } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const fmt = moneyFormatter(tenant.currency);
  const payAtStudioOk = ((tenant.policies ?? {}) as { payAtStudio?: boolean }).payAtStudio !== false;
  const stripeOn = studioStripeEnabled(tenant);

  const session = await db.classSession.findFirst({
    where: { id, tenantId: tenant.id, isPublic: true, status: "SCHEDULED" },
    include: {
      classType: true,
      instructor: true,
      bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } },
    },
  });
  if (!session || session.startsAt < new Date()) notFound();
  const ct = session.classType;
  const spotsLeft = session.capacity - session.bookings.reduce((n, b) => n + b.qty, 0);
  const full = spotsLeft <= 0;
  const maxQty = full ? 1 : Math.min(5, spotsLeft);

  const cs = await getCustomerSession();
  const authed = cs && cs.tenantId === tenant.id;
  const creditSum = authed
    ? (await db.clientPackage.aggregate({
        where: { tenantId: tenant.id, clientId: cs!.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        _sum: { creditsLeft: true },
      }))._sum.creditsLeft ?? 0
    : 0;

  const when = session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "long", month: "long", day: "numeric" });
  const input = "h-10 w-full rounded-[9px] border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-muted focus:ring-4";
  const radio = "flex cursor-pointer items-center gap-3 rounded-xl border border-line-2 bg-surface px-4 py-3 text-[13.5px] font-semibold text-ink has-[:checked]:border-transparent has-[:checked]:ring-2";
  const chip = "rounded-full bg-line-2 px-3 py-1 text-[12px] font-semibold text-ink-2";

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="book" brand={brand} />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <Link href={`/book/${slug}`} className="text-[12.5px] font-bold text-muted hover:text-ink">← All classes</Link>

        {/* Hero */}
        <div className="relative mt-3 overflow-hidden rounded-3xl" style={{ background: `linear-gradient(120deg, ${ct.color}, ${ct.color}88)` }}>
          {ct.heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ct.heroImage} alt={ct.name} className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="relative bg-gradient-to-t from-black/60 via-black/20 to-transparent px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${diffTone[ct.difficulty] ?? "bg-white/20 text-white"}`}>{difficultyLabel(ct.difficulty)}</span>
              {ct.format && <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">{ct.format}</span>}
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold capitalize text-white">{ct.kind.toLowerCase()}</span>
              {ct.tags.map((t) => <span key={t} className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">{t}</span>)}
            </div>
            <h1 className="mt-3 font-display text-[34px] font-extrabold tracking-tight text-white sm:text-[42px]">{ct.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px] font-semibold text-white/90">
              <span>{when} · {timeInTz(session.startsAt, tenant.timezone)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {ct.durationMin} min</span>
              {session.instructor && <span className="inline-flex items-center gap-1.5"><UserIcon className="size-4" /> {session.instructor.name}</span>}
              {session.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {session.location}</span>}
            </div>
          </div>
        </div>

        {err && <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">{ERRORS[err] ?? ERRORS.failed}</div>}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {ct.description && (
              <section>
                <h2 className="font-display text-[19px] font-extrabold text-ink">About this class</h2>
                <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-2">{ct.description}</p>
              </section>
            )}

            {(ct.benefits.length > 0 || ct.goodFor.length > 0) && (
              <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {ct.benefits.length > 0 && (
                  <div>
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Benefits</h3>
                    <ul className="mt-2 space-y-1.5">
                      {ct.benefits.map((b) => <li key={b} className="flex items-start gap-2 text-[13.5px] text-ink-2"><span style={{ color: brand }}>✦</span>{b}</li>)}
                    </ul>
                  </div>
                )}
                {ct.goodFor.length > 0 && (
                  <div>
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Good for</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">{ct.goodFor.map((g) => <span key={g} className={chip}>{g}</span>)}</div>
                  </div>
                )}
              </section>
            )}

            {ct.muscles.length > 0 && (
              <section className="rounded-3xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
                <h2 className="font-display text-[19px] font-extrabold text-ink">Muscle focus</h2>
                <p className="mt-1 text-[12.5px] text-muted">What this class works</p>
                <div className="mt-4"><MuscleMap initial={ct.muscles} readonly /></div>
              </section>
            )}

            {ct.equipment.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted"><Dumbbell className="size-4" /> Equipment</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">{ct.equipment.map((e) => <span key={e} className={chip}>{e}</span>)}</div>
              </section>
            )}
          </div>

          {/* Booking card */}
          <aside className="h-fit rounded-3xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-[26px] font-extrabold text-ink">{fmt.format(Number(ct.price))}<span className="text-[13px] font-semibold text-muted"> / person</span></div>
              <span className={`text-[12.5px] font-bold ${full ? "text-muted" : spotsLeft <= 2 ? "text-brand" : "text-green"}`}>
                {full ? "Full — waitlist open" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
              </span>
            </div>

            <form method="post" action="/api/public/book" className="mt-5 space-y-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="from" value={`/book/${slug}/class/${session.id}`} />

              {!full && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">How many people?</label>
                  <select name="qty" className={input} defaultValue="1">
                    {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n === 1 ? "Just me" : `${n} people`}</option>
                    ))}
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
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">How will you pay?</label>
                  <div className="space-y-2">
                    {authed && creditSum > 0 && (
                      <label className={radio} style={{ "--tw-ring-color": brand } as React.CSSProperties}>
                        <input type="radio" name="pay" value="credit" defaultChecked className="accent-current" style={{ accentColor: brand }} />
                        <Ticket className="size-4" style={{ color: brand }} />
                        <span>Use my class credits <span className="font-normal text-muted">({creditSum} left)</span></span>
                      </label>
                    )}
                    {payAtStudioOk && (
                      <label className={radio} style={{ "--tw-ring-color": brand } as React.CSSProperties}>
                        <input type="radio" name="pay" value="at_studio" defaultChecked={!authed || creditSum === 0} className="accent-current" style={{ accentColor: brand }} />
                        <span>Pay at the studio</span>
                      </label>
                    )}
                    {stripeOn && authed ? (
                      <label className={radio} style={{ "--tw-ring-color": brand } as React.CSSProperties}>
                        <input type="radio" name="pay" value="online" className="accent-current" style={{ accentColor: brand }} />
                        <span>Pay online in full <span className="font-normal text-muted">· card via Stripe</span></span>
                      </label>
                    ) : (
                      <label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-dashed border-line-2 bg-raised px-4 py-3 text-[13.5px] font-semibold text-muted">
                        <input type="radio" name="pay" value="online" disabled />
                        <span>Pay online in full <span className="font-normal">{stripeOn ? "· sign in to pay online" : "· coming soon"}</span></span>
                      </label>
                    )}
                    <label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-dashed border-line-2 bg-raised px-4 py-3 text-[13.5px] font-semibold text-muted">
                      <input type="radio" name="pay" value="deposit" disabled />
                      <span>Reserve with a deposit <span className="font-normal">· coming soon</span></span>
                    </label>
                    {!payAtStudioOk && (!authed || creditSum === 0) && (
                      <p className="text-[12px] font-medium text-rose">This studio books with class credits — <Link href={`/book/${slug}/packages`} className="font-bold underline">get a package</Link> first.</p>
                    )}
                  </div>
                </div>
              )}

              <button
                disabled={!full && !payAtStudioOk && (!authed || creditSum === 0)}
                className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: full ? brand : "#17181C" }}
              >
                {full ? "Join the waitlist" : "Confirm booking"}
              </button>
            </form>
          </aside>
        </div>

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
