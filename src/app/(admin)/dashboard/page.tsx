import { Card, CardHeader } from "@/components/ui/card";
import { Globe, Rocket } from "lucide-react";
import { Kpi } from "@/components/ui/kpi";
import {
  DollarSign, CalendarCheck, Gauge, Users, CheckCircle2, Circle,
  CalendarDays, CreditCard, UserPlus, Sparkles, Settings2,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const quickActions = [
  { label: "Today's schedule", icon: CalendarDays, href: "/schedule" },
  { label: "Open POS", icon: CreditCard, href: "/pos" },
  { label: "Add client", icon: UserPlus, href: "/clients/new" },
  { label: "Studio settings", icon: Settings2, href: "/settings" },
];

const donutSpec: Array<[string, string, string]> = [
  ["package", "Packages", "#8B5CF6"],
  ["product", "Merchandise", "#F97316"],
  ["dropin", "Drop-ins", "#22A565"],
  ["migrated", "Historical", "#3B82F6"],
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = p === "week" || p === "month" ? p : "today";
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const liveVisitors = (await db.pageView.groupBy({ by: ["visitorId"], where: { tenantId: tenant.id, createdAt: { gt: new Date(Date.now() - 5 * 60_000) } } })).length;

  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const monthKey = todayKey.slice(0, 7);
  const monthStart = new Date(`${monthKey}-01T00:00:00Z`);
  monthStart.setUTCHours(-14);
  const weekAhead = new Date(Date.now() + 7 * 86400_000);
  const dayAgo = new Date(Date.now() - 86400_000);
  const periodStart = period === "today" ? dayAgo : period === "week" ? new Date(Date.now() - 7 * 86400_000) : monthStart;
  const inPeriod = (d: Date) =>
    period === "today" ? dayKeyInTz(d, tenant.timezone) === todayKey
    : period === "month" ? dayKeyInTz(d, tenant.timezone).startsWith(monthKey)
    : true; // week uses the raw range

  const [typeCount, pkgCount, clientCount, sessionCount, monthOrders, periodOrders, weekBookings, weekSessions, activeClients, periodNewClients, periodBookings, periodSessions] = await Promise.all([
    db.classType.count({ where: { tenantId: tenant.id, active: true } }),
    db.package.count({ where: { tenantId: tenant.id, active: true } }),
    db.client.count({ where: { tenantId: tenant.id } }),
    db.classSession.count({ where: { tenantId: tenant.id } }),
    db.order.findMany({ where: { tenantId: tenant.id, status: "PAID", createdAt: { gte: monthStart } }, select: { total: true, createdAt: true } }),
    db.order.findMany({ where: { tenantId: tenant.id, status: "PAID", createdAt: { gte: periodStart } }, include: { items: true } }),
    db.booking.count({ where: { tenantId: tenant.id, status: { in: ["BOOKED", "CHECKED_IN"] }, session: { startsAt: { gte: dayAgo, lt: weekAhead } } } }),
    db.classSession.findMany({ where: { tenantId: tenant.id, startsAt: { gte: dayAgo, lt: weekAhead }, status: { not: "CANCELLED" } }, include: { _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } } }),
    db.client.count({ where: { tenantId: tenant.id, lastVisitAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    db.client.count({ where: { tenantId: tenant.id, createdAt: { gte: periodStart } } }),
    db.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: periodStart } } }),
    db.classSession.count({ where: { tenantId: tenant.id, status: { not: "CANCELLED" }, startsAt: { gte: periodStart, lt: new Date() } } }),
  ]);

  const monthRevenue = monthOrders.filter((o) => dayKeyInTz(o.createdAt, tenant.timezone).startsWith(monthKey)).reduce((s, o) => s + Number(o.total), 0);
  const weekCap = weekSessions.reduce((s, x) => s + x.capacity, 0);
  const weekBooked = weekSessions.reduce((s, x) => s + x._count.bookings, 0);
  const occupancy = weekCap ? Math.round((weekBooked / weekCap) * 100) : 0;

  const setupSteps = [
    { label: "Studio profile", done: tenant.name !== "My Studio", href: "/settings" },
    { label: "Class types", done: typeCount > 0, href: "/class-types" },
    { label: "Packages", done: pkgCount > 0, href: "/products" },
    { label: "First client", done: clientCount > 0, href: "/clients/new" },
    { label: "First class scheduled", done: sessionCount > 0, href: "/schedule/new" },
    { label: "First sale", done: monthOrders.length > 0, href: "/pos" },
  ];
  const done = setupSteps.filter((s) => s.done).length;

  // Period summary
  const scoped = periodOrders.filter((o) => inPeriod(o.createdAt));
  const revenue = scoped.reduce((s, o) => s + Number(o.total), 0);
  const pkgsSold = scoped.reduce((s, o) => s + o.items.filter((i) => i.kind === "package").reduce((a, i2) => a + i2.qty, 0), 0);
  const summary: Array<[string, string]> = [
    ["Revenue", fmt.format(revenue)],
    ["Orders", String(scoped.length)],
    ["Packages sold", String(pkgsSold)],
    ["New clients", String(periodNewClients)],
    ["Bookings made", String(periodBookings)],
    ["Classes held", String(periodSessions)],
  ];

  // Sales mix donut (same period)
  const kindTotals = new Map<string, number>();
  for (const o of scoped) for (const it of o.items) kindTotals.set(it.kind, (kindTotals.get(it.kind) ?? 0) + Number(it.unitPrice) * it.qty);
  const donutTotal = [...kindTotals.values()].reduce((a, b) => a + b, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = donutSpec
    .map(([k, label, color]) => {
      const v = kindTotals.get(k) ?? 0;
      const seg = { label, color, v, frac: donutTotal ? v / donutTotal : 0, offset: acc };
      acc += seg.frac;
      return seg;
    })
    .filter((s) => s.v > 0);

  const periodLabel = period === "today" ? "Today" : period === "week" ? "Last 7 days" : "This month";
  const chip = (key: string, label: string) => (
    <Link
      key={key}
      href={`/dashboard?p=${key}`}
      className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${period === key ? "bg-brand text-white" : "bg-line-2 text-ink-2 hover:bg-line"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Everything happening in your studio, at a glance.</p>
        </div>
      </div>

      {/* Getting started */}
      {done < setupSteps.length && (
        <Card className="mb-6">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-[16.5px] font-extrabold text-ink">Get your studio ready <Rocket className="inline size-4 -mt-0.5 text-brand" /></div>
              <span className="text-[13px] font-semibold text-muted">{done} of {setupSteps.length} complete</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / setupSteps.length) * 100}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
              {setupSteps.map((s) => (
                <Link key={s.label} href={s.href} className="flex items-center gap-2 rounded-xl border border-line-2 bg-raised px-3 py-2.5 text-[13px] font-medium transition-colors hover:border-brand/40">
                  {s.done ? <CheckCircle2 className="size-4 shrink-0 text-green" /> : <Circle className="size-4 shrink-0 text-muted" />}
                  <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
                </Link>
              ))}
            </div>
            <Link href="/welcome" className="mt-3 inline-block text-[13px] font-bold text-brand hover:underline">Guided setup →</Link>
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Link key={a.label} href={a.href} className="inline-flex items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-[var(--shadow-card)] transition-colors hover:border-brand/40 hover:text-brand">
            <a.icon className="size-4 text-brand" /> {a.label}
          </Link>
        ))}
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={DollarSign} tone="o" label="Monthly revenue" value={fmt.format(monthRevenue)} />
        <Kpi icon={CalendarCheck} tone="p" label="Bookings this week" value={String(weekBookings)} />
        <Kpi icon={Gauge} tone="g" label="Occupancy this week" value={`${occupancy}%`} />
        <Kpi icon={Users} tone="b" label="Active clients (30d)" value={String(activeClients)} />
        <Link href="/analytics" className="block"><Kpi icon={Globe} tone="g" label="Live on your site" value={String(liveVisitors)} /></Link>
      </div>

      {/* Two-column widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            eyebrow="Overview"
            title="Business Summary"
            sub={periodLabel}
            action={<div className="flex gap-1.5">{chip("today", "Today")}{chip("week", "Week")}{chip("month", "Month")}</div>}
          />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {summary.map(([l, v]) => (
              <div key={l} className="rounded-xl border border-line-2 bg-raised px-3.5 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{l}</div>
                <div className="mt-1 font-display text-lg font-extrabold text-ink">{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Sales mix" title="What's Driving Revenue" sub={periodLabel} />
          {segs.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 p-5 text-center">
              <Sparkles className="size-6 text-muted" />
              <p className="max-w-[220px] text-[13px] text-muted">No sales in this period yet — ring one up in the POS.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-5">
              <div className="relative">
                <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Sales mix">
                  <circle cx="70" cy="70" r={R} fill="none" stroke="#F2F2F4" strokeWidth="16" />
                  {segs.map((s) => (
                    <circle
                      key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16"
                      strokeDasharray={`${(s.frac * C).toFixed(1)} ${C.toFixed(1)}`}
                      strokeDashoffset={(-s.offset * C).toFixed(1)}
                      transform="rotate(-90 70 70)"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="font-display text-[15px] font-extrabold text-ink">{fmt.format(donutTotal)}</div>
                  </div>
                </div>
              </div>
              <ul className="w-full space-y-1.5">
                {segs.map((s) => (
                  <li key={s.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="inline-flex items-center gap-2 text-ink-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
                    <span className="font-semibold text-ink">{fmt.format(s.v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
