import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import {
  DollarSign, CalendarCheck, Gauge, Users, CheckCircle2, Circle,
  CalendarDays, CreditCard, UserPlus, Globe, Sparkles,
} from "lucide-react";
import Link from "next/link";

const setupSteps = [
  { label: "Studio profile", done: true },
  { label: "Website published", done: true },
  { label: "Class types", done: true },
  { label: "Packages", done: true },
  { label: "Team members", done: false },
  { label: "Online payments", done: false },
];

const quickActions = [
  { label: "Today's schedule", icon: CalendarDays, href: "/schedule" },
  { label: "Open POS", icon: CreditCard, href: "/pos" },
  { label: "Add client", icon: UserPlus, href: "/clients" },
  { label: "View my website", icon: Globe, href: "/settings" },
];

export default function DashboardPage() {
  const done = setupSteps.filter((s) => s.done).length;
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
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-line-2 bg-raised px-3 py-2.5 text-[13px] font-medium">
                {s.done
                  ? <CheckCircle2 className="size-4 shrink-0 text-green" />
                  : <Circle className="size-4 shrink-0 text-muted" />}
                <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
              </div>
            ))}
          </div>
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
        <Kpi icon={DollarSign} tone="o" label="Monthly revenue" value="$0" delta={{ value: "0%" }} />
        <Kpi icon={CalendarCheck} tone="p" label="Bookings this week" value="0" delta={{ value: "0%" }} />
        <Kpi icon={Gauge} tone="g" label="Avg occupancy" value="0%" />
        <Kpi icon={Users} tone="b" label="Active clients (30d)" value="0" />
      </div>

      {/* Two-column widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Overview" title="Business Summary" sub="Today" />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {[
              ["Revenue", "$0"], ["Profit", "$0"], ["New clients", "0"], ["Classes", "0"],
              ["Packages sold", "0"], ["Bookings", "0"], ["Visitors", "0"], ["Merch", "$0"],
            ].map(([l, v]) => (
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
