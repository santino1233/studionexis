import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string; s?: string }>;
}) {
  const { slug } = await params;
  const { ok, err, s: errSession } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const fmt = moneyFormatter(tenant.currency);
  const sessions = await db.classSession.findMany({
    where: { tenantId: tenant.id, status: "SCHEDULED", startsAt: { gt: new Date(), lt: new Date(Date.now() + 7 * 86400_000) } },
    include: { classType: true, instructor: true, _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
    orderBy: { startsAt: "asc" },
  });
  const byDay = new Map<string, typeof sessions>();
  for (const x of sessions) {
    const k = dayKeyInTz(x.startsAt, tenant.timezone);
    byDay.set(k, [...(byDay.get(k) ?? []), x]);
  }

  const brand = tenant.brandColor || "#F97316";
  const input = "h-10 w-full rounded-[9px] border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-muted focus:ring-4";

  return (
    <div className="min-h-screen bg-canvas" style={{ ["--pb" as string]: brand }}>
      {/* Studio header */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-5 py-5">
          <div>
            <div className="font-display text-[22px] font-extrabold tracking-tight text-ink">{tenant.name}</div>
            <div className="text-[12px] text-muted">Book a class · times in {tenant.timezone.replace("_", " ")}</div>
          </div>
          <div className="flex items-center gap-4">
            <a href={`/book/${slug}/me`} className="text-[13px] font-bold" style={{ color: brand }}>My account</a>
            <div className="grid size-11 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: brand }}>
              {tenant.name.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-5 py-8">
        {ok === "booked" && (
          <div className="mb-6 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">
            You&apos;re booked! See you in class. 🎉
          </div>
        )}
        {ok === "waitlist" && (
          <div className="mb-6 rounded-2xl border px-5 py-4 text-[14px] font-bold" style={{ borderColor: `${brand}33`, background: `${brand}14`, color: brand }}>
            That class is full — you&apos;re on the waitlist and we&apos;ll move you up if a spot opens.
          </div>
        )}
        {err && (
          <div className="mb-6 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">
            {err === "already" ? "You're already on that class." : err === "missing" ? "Please give your name and a phone or email." : "That didn't work — try again."}
          </div>
        )}

        {[...byDay.entries()].map(([day, list]) => (
          <section key={day} className="mb-8">
            <h2 className="mb-3 font-display text-[17px] font-extrabold text-ink">
              {new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <div className="space-y-3">
              {list.map((x) => {
                const spotsLeft = x.capacity - x._count.bookings;
                const showForm = errSession === x.id;
                return (
                  <div key={x.id} className="rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="size-3 rounded-full" style={{ background: x.classType.color }} />
                        <div>
                          <div className="text-[15px] font-bold text-ink">{x.classType.name}</div>
                          <div className="text-[12.5px] text-muted">
                            {timeInTz(x.startsAt, tenant.timezone)} · {x.classType.durationMin} min
                            {x.instructor ? ` · ${x.instructor.name}` : ""} · {fmt.format(Number(x.classType.price))}
                          </div>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${spotsLeft > 0 ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>
                        {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : "Full — waitlist"}
                      </span>
                    </div>
                    <details className="mt-3" open={showForm}>
                      <summary className="cursor-pointer text-[13px] font-bold" style={{ color: brand }}>
                        {spotsLeft > 0 ? "Book this class →" : "Join the waitlist →"}
                      </summary>
                      <form method="post" action="/api/public/book" className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="sessionId" value={x.id} />
                        <input name="name" required placeholder="Your name" className={input} />
                        <input name="phone" placeholder="Phone" className={input} />
                        <input name="email" type="email" placeholder="Email" className={input} />
                        <button className="h-10 rounded-[9px] text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: brand }}>
                          Confirm
                        </button>
                      </form>
                    </details>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {sessions.length === 0 && (
          <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
            No upcoming classes this week — check back soon.
          </div>
        )}

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
