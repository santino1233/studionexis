import { Card, CardHeader } from "@/components/ui/card";
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

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const monthKey = dayKeyInTz(new Date(), tenant.timezone).slice(0, 7);
  const monthStart = new Date(`${monthKey}-01T00:00:00Z`);
  monthStart.setUTCHours(-14);
  const weekAhead = new Date(Date.now() + 7 * 86400_000);
  const thirtyAgo = new Date(Date.now() - 30 * 86400_000);

  const [typeCount, pkgCount, clientCount, sessionCount, orders, weekBookings, weekSessions, activeClients] = await Promise.all([
    db.classType.count({ where: { tenantId: tenant.id, active: true } }),
    db.package.count({ where: { tenantId: tenant.id, active: true } }),
    db.client.count({ where: { tenantId: tenant.id } }),
    db.classSession.count({ where: { tenantId: tenant.id } }),
    db.order.findMany({ where: { tenantId: tenant.id, status: "PAID", createdAt: { gte: monthStart } }, select: { total: true, createdAt: true } }),
    db.booking.count({ where: { tenantId: tenant.id, status: { in: ["BOOKED", "CHECKED_IN"] }, session: { startsAt: { gte: new Date(Date.now() - 86400_000), lt: weekAhead } } } }),
    db.classSession.findMany({ where: { tenantId: tenant.id, startsAt: { gte: new Date(Date.now() - 86400_000), lt: weekAhead }, status: { not: "CANCELLED" } }, include: { _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } } }),
    db.client.count({ where: { tenantId: tenant.id, lastVisitAt: { gte: thirtyAgo } } }),
  ]);

  const monthRevenue = orders.filter((o) => dayKeyInTz(o.createdAt, tenant.timezone).startsWith(monthKey)).reduce((s, o) => s + Number(o.total), 0);
  const weekCap = weekSessions.reduce((s, x) => s + x.capacity, 0);
  const weekBooked = weekSessions.reduce((s, x) => s + x._count.bookings, 0);
  const occupancy = weekCap ? Math.round((weekBooked / weekCap) * 100) : 0;

  const setupSteps = [
    { label: "Studio profile", done: tenant.name !== "My Studio", href: "/settings" },
    { label: "Class types", done: typeCount > 0, href: "/class-types" },
    { label: "Packages", done: pkgCount > 0, href: "/products" },
    { label: "First client", done: clientCount > 0, href: "/clients/new" },
    { label: "First class scheduled", done: sessionCount > 0, href: "/schedule/new" },
    { label: "First sale", done: orders.length > 0, href: "/pos" },
  ];
  const done = setupSteps.filter((s) => s.done).length;

  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const todayOrders = orders.filter((o) => dayKeyInTz(o.createdAt, tenant.timezone) === todayKey);
  const dayAgo = new Date(Date.now() - 86400_000);
  const [newToday, bookingsToday, creditsOwed] = await Promise.all([
    db.client.count({ where: { tenantId: tenant.id, createdAt: { gte: dayAgo } } }),
    db.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: dayAgo } } }),
    db.clientPackage.aggregate({ where: { tenantId: tenant.id, creditsLeft: { gt: 0 }, expiresAt: { gt: new Date() } }, _sum: { creditsLeft: true } }),
  ]);
  const summary: Array<[string, string]> = [
    ["Revenue", fmt.format(todayOrders.reduce((s, o) => s + Number(o.total), 0))],
    ["Orders", String(todayOrders.length)],
    ["New clients", String(newToday)],
    ["Classes", String(weekSessions.filter((s) => dayKeyInTz(s.startsAt, tenant.timezone) === todayKey).length)],
    ["Bookings", String(bookingsToday)],
    ["Credits owed", String(creditsOwed._sum.creditsLeft ?? 0)],
    ["Clients total", String(clientCount)],
    ["Classes total", String(sessionCount)],
  ];
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Everything happening in your studio, at a glance.</p>
        </div>
      </div>

      {/* Getting started */}
      <Card className="mb-6">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-[16.5px] font-extrabold text-ink">
              Get your studio ready <span className="ml-1">🚀</span>
            </div>
            <span className="text-[13px] font-semibold text-muted">{done} of {setupSteps.length} complete</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / setupSteps.length) * 100}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            {setupSteps.map((s) => (
              <Link key={s.label} href={s.href} className="flex items-center gap-2 rounded-xl border border-line-2 bg-raised px-3 py-2.5 text-[13px] font-medium transition-colors hover:border-brand/40">
                {s.done
                  ? <CheckCircle2 className="size-4 shrink-0 text-green" />
                  : <Circle className="size-4 shrink-0 text-muted" />}
                <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
              </Link>
            ))}
          </div>
          {done < setupSteps.length && (
            <Link href="/welcome" className="mt-3 inline-block text-[13px] font-bold text-brand hover:underline">Guided setup →</Link>
          )}
        </div>
      </Card>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="inline-flex items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-[var(--shadow-card)] transition-colors hover:border-brand/40 hover:text-brand"
          >
            <a.icon className="size-4 text-brand" /> {a.label}
          </Link>
        ))}
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} tone="o" label="Monthly revenue" value={fmt.format(monthRevenue)} />
        <Kpi icon={CalendarCheck} tone="p" label="Bookings this week" value={String(weekBookings)} />
        <Kpi icon={Gauge} tone="g" label="Occupancy this week" value={`${occupancy}%`} />
        <Kpi icon={Users} tone="b" label="Active clients (30d)" value={String(activeClients)} />
      </div>

      {/* Two-column widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Overview" title="Business Summary" sub="Today" />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {summary.map(([l, v]) => (
              <div key={l} className="rounded-xl border border-line-2 bg-raised px-3.5 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{l}</div>
                <div className="mt-1 font-display text-lg font-extrabold text-ink">{v}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Sales mix" title="What's Driving Revenue" />
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 p-5 text-center">
            <Sparkles className="size-6 text-muted" />
            <p className="max-w-[220px] text-[13px] text-muted">Once sales come in, your revenue breakdown appears here.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
