import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, PartyPopper, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { timeInTz } from "@/lib/tz";
import { CustomerNav } from "@/components/customer/nav";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  BOOKED: "bg-green-wash text-green",
  CHECKED_IN: "bg-green-wash text-green",
  WAITLIST: "bg-brand-wash text-brand",
  CANCELLED: "bg-line-2 text-muted",
  LATE_CANCEL: "bg-rose/10 text-rose",
  NO_SHOW: "bg-rose/10 text-rose",
};
const statusLabel: Record<string, string> = {
  BOOKED: "Confirmed", CHECKED_IN: "Attended", WAITLIST: "Waitlist",
  CANCELLED: "Cancelled", LATE_CANCEL: "Late cancel", NO_SHOW: "No show",
};

export default async function MyBookingsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; ok?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { t, ok, error } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const cs = await getCustomerSession();
  if (!cs || cs.tenantId !== tenant.id) {
    return (
      <div className="min-h-screen bg-canvas">
        <CustomerNav slug={slug} active="bookings" brand={brand} />
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center">
        {ok === "paid" && (
          <div className="mb-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">
            <PartyPopper className="inline size-4 -mt-0.5" /> Paid &amp; booked — see you in class!
          </div>
        )}
          <h1 className="font-display text-[24px] font-extrabold text-ink">Sign in to see your bookings</h1>
          <Link href={`/book/${slug}/account`} className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: brand }}>Sign in</Link>
        </main>
      </div>
    );
  }

  const bookings = await db.booking.findMany({
    where: { tenantId: tenant.id, clientId: cs.clientId },
    include: { session: { include: { classType: true, instructor: true } } },
    orderBy: { session: { startsAt: "desc" } },
    take: 100,
  });
  const now = new Date();
  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number; cancelWindowPrivateHours?: number };

  const upcoming = bookings.filter((b) => b.session.startsAt > now && b.status === "BOOKED").sort((a, b) => a.session.startsAt.getTime() - b.session.startsAt.getTime());
  const waitlist = bookings.filter((b) => b.session.startsAt > now && b.status === "WAITLIST").sort((a, b) => a.session.startsAt.getTime() - b.session.startsAt.getTime());
  const past = bookings.filter((b) => b.session.startsAt <= now || ["CANCELLED", "LATE_CANCEL", "NO_SHOW"].includes(b.status));

  const tab = t === "waitlist" ? "waitlist" : t === "past" ? "past" : "upcoming";
  const shown = tab === "waitlist" ? waitlist : tab === "past" ? past : upcoming;
  const tabs = [["upcoming", "Upcoming", upcoming.length], ["waitlist", "Waitlist", waitlist.length], ["past", "Past", past.length]] as const;

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="bookings" brand={brand} />
      <main className="mx-auto max-w-[860px] px-4 py-8 sm:px-6">
        {ok === "cancelled" && <div className="mb-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-3.5 text-[13.5px] font-bold text-green">Booking cancelled — any class credit has been returned to your account.</div>}
        {error === "toolate" && <div className="mb-5 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-3.5 text-[13.5px] font-medium text-rose">It&apos;s too close to class time to cancel online — please contact the studio.</div>}
        {error === "notfound" && <div className="mb-5 rounded-2xl border border-line-2 bg-raised px-5 py-3.5 text-[13.5px] font-medium text-ink-2">That booking could not be found — it may already be cancelled.</div>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">My Bookings</h1>
            <p className="mt-1 text-sm text-muted">All your past, current, and upcoming sessions.</p>
          </div>
          <Link href={`/book/${slug}`} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: "#17181C" }}>
            <Plus className="size-4" /> Book Class
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-6 border-b border-line-2">
          {tabs.map(([key, label, n]) => (
            <Link key={key} href={`?t=${key}`}
              className={`flex items-center gap-2 border-b-2 pb-3 text-[14px] font-bold transition-colors ${tab === key ? "text-ink" : "border-transparent text-muted hover:text-ink"}`}
              style={tab === key ? { borderColor: brand } : undefined}>
              {label}
              <span className={`grid size-5 place-items-center rounded-full text-[10.5px] font-bold ${tab === key && n > 0 ? "text-white" : "bg-line-2 text-muted"}`} style={tab === key && n > 0 ? { background: brand } : undefined}>{n}</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {shown.map((b) => {
            const s = b.session;
            const windowH = s.classType.kind === "PRIVATE" ? pol.cancelWindowPrivateHours ?? 3 : pol.cancelWindowGroupHours ?? 3;
            const cancellable = (b.status === "BOOKED" || b.status === "WAITLIST") && s.startsAt > now && (s.startsAt.getTime() - Date.now()) / 3600_000 >= windowH;
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-5 rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
                <div className="w-[52px] text-center">
                  <div className="text-[10px] font-bold uppercase text-muted">{s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short" })}</div>
                  <div className="font-display text-[26px] font-extrabold leading-tight text-ink">{s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, day: "numeric" })}</div>
                  <div className="text-[10px] font-semibold text-muted">{s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short" })}</div>
                </div>
                <div className="min-w-0 flex-1 border-l border-line-2 pl-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-ink">{s.classType.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted">
                    <Clock className="inline size-3.5 -mt-0.5" /> {timeInTz(s.startsAt, tenant.timezone)} · {s.classType.durationMin} min
                    {s.instructor ? ` · ${s.instructor.name}` : ""} · {s.classType.kind === "PRIVATE" ? "Private" : "Group"}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-muted">Ref: NX-{b.id.slice(-8)}</div>
                  <div className="mt-1 text-[12px] font-semibold" style={{ color: brand }}>
                    {b.paymentMethod === "package_credit" ? "Paid with package credit" : b.paymentMethod === "at_studio" ? "Due at studio" : ""}
                  </div>
                </div>
                {cancellable && (
                  <form method="post" action="/api/public/customer">
                    <input type="hidden" name="mode" value="cancel" />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="bookingId" value={b.id} />
                    <button className="rounded-xl bg-line-2 px-4 py-2 text-[12.5px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">Cancel</button>
                  </form>
                )}
              </div>
            );
          })}
          {shown.length === 0 && (
            <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
              Nothing here yet — <Link href={`/book/${slug}`} className="font-bold" style={{ color: brand }}>book a class</Link>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
