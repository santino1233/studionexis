import Link from "next/link";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { moneyFormatter } from "@/lib/tenant";
import { CustomerNav } from "@/components/customer/nav";

export const dynamic = "force-dynamic";

const LEVELS = [["", "All Classes"], ["BEGINNER", "Beginner"], ["INTERMEDIATE", "Intermediate"], ["ADVANCED", "Advanced"]] as const;
const diffTone: Record<string, string> = {
  BEGINNER: "bg-green-wash text-green",
  INTERMEDIATE: "bg-brand-wash text-brand",
  ADVANCED: "bg-rose/10 text-rose",
};

export default async function BookPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; lvl?: string; ok?: string; err?: string; s?: string }>;
}) {
  const { slug } = await params;
  const { d, lvl, ok, err, s: errSession } = await searchParams;
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
    where: { tenantId: tenant.id, status: "SCHEDULED", startsAt: { gt: new Date(), lt: new Date(Date.now() + 15 * 86400_000) } },
    include: { classType: true, instructor: true, _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
    orderBy: { startsAt: "asc" },
  });
  const forDay = (day: string) => all.filter((x) => dayKeyInTz(x.startsAt, tenant.timezone) === day && (!lvl || x.classType.difficulty === lvl));
  let list = forDay(selected);
  let showingDay = selected;
  let rolled = false;
  if (list.length === 0 && selected === todayKey && !d) {
    const next = days.find((day) => forDay(day).length > 0);
    if (next && next !== todayKey) { showingDay = next; list = forDay(next); rolled = true; }
  }

  const credits = authed
    ? await db.clientPackage.groupBy({
        by: ["tenantId"],
        where: { tenantId: tenant.id, clientId: cs!.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        _sum: { creditsLeft: true },
      })
    : [];
  const creditSum = credits[0]?._sum.creditsLeft ?? 0;

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
            <p className="mt-1 text-sm text-muted">{tenant.name} · times in {tenant.timezone.replace("_", " ")}</p>
          </div>
          {authed && (
            <div className="rounded-2xl border border-line-2 bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted"><Ticket className="size-3.5" style={{ color: brand }} /> Your credits</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[24px] font-extrabold text-ink">{creditSum}</span>
                <span className="text-[12px] text-muted">class credits</span>
              </div>
            </div>
          )}
        </div>

        {/* Day strip */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => {
            const dt = new Date(`${day}T12:00:00Z`);
            const isSel = day === showingDay;
            const isToday = day === todayKey;
            const has = (dayCounts.get(day) ?? 0) > 0;
            return (
              <Link
                key={day}
                href={`?d=${day}${lvl ? `&lvl=${lvl}` : ""}`}
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

        {/* Level filter */}
        <div className="mt-3 flex flex-wrap gap-2">
          {LEVELS.map(([v, label]) => {
            const active = (lvl ?? "") === v;
            return (
              <Link key={v} href={`?d=${showingDay}${v ? `&lvl=${v}` : ""}`}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${active ? "border-transparent text-white" : "border-line-2 bg-surface text-ink-2 hover:text-ink"}`}
                style={active ? { background: "#17181C" } : undefined}>
                {label}
              </Link>
            );
          })}
        </div>

        {ok === "booked" && <div className="mt-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">You&apos;re booked! See you in class. 🎉</div>}
        {ok === "waitlist" && <div className="mt-5 rounded-2xl border px-5 py-4 text-[14px] font-bold" style={{ borderColor: `${brand}33`, background: `${brand}14`, color: brand }}>That class is full — you&apos;re on the waitlist.</div>}
        {err && <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">{err === "already" ? "You're already on that class." : err === "missing" ? "Please give your name and a phone or email." : err === "full" ? "The studio can't take online bookings right now — please contact them directly." : "That didn't work — try again."}</div>}
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
            const spotsLeft = x.capacity - x._count.bookings;
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
                      <span className="text-[16px] font-bold text-ink">{x.classType.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${diffTone[x.classType.difficulty] ?? "bg-line-2 text-ink-2"}`}>
                        {x.classType.difficulty.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {x.instructor ? `${x.instructor.name} · ` : ""}{fmt.format(Number(x.classType.price))}{x.location ? ` · ${x.location}` : ""}
                    </div>
                    {x.classType.description && <p className="mt-1 max-w-[520px] text-[12px] leading-relaxed text-muted">{x.classType.description}</p>}
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
                      <details open={open}>
                        <summary className="cursor-pointer list-none rounded-xl px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: "#17181C" }}>
                          {spotsLeft > 0 ? "Book now" : "Join waitlist"}
                        </summary>
                      </details>
                    )}
                  </div>
                </div>
                {!authed && (
                  <details open={open} className="border-t border-line-2 bg-raised px-5 [&[open]]:py-4">
                    <summary className="cursor-pointer list-none py-2.5 text-[12.5px] font-bold" style={{ color: brand }}>Book as a guest →</summary>
                    <form method="post" action="/api/public/book" className="grid grid-cols-1 gap-2.5 pb-1 sm:grid-cols-4">
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="sessionId" value={x.id} />
                      <input name="name" required placeholder="Your name" className={input} />
                      <input name="phone" placeholder="Phone" className={input} />
                      <input name="email" type="email" placeholder="Email" className={input} />
                      <button className="h-10 rounded-[9px] text-[13px] font-bold text-white" style={{ background: brand }}>Confirm</button>
                    </form>
                    <p className="pb-1 text-[11.5px] text-muted">Have an account? <Link href={`/book/${slug}/account`} className="font-bold" style={{ color: brand }}>Sign in</Link> to book with one click.</p>
                  </details>
                )}
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
              No classes match this day{lvl ? " and level" : ""} — try another.
            </div>
          )}
        </div>

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
