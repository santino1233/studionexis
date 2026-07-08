import { DollarSign, CalendarCheck, Gauge, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

function monthRange(tz: string, ym?: string) {
  const now = dayKeyInTz(new Date(), tz); // YYYY-MM-DD in studio tz
  const [y, m] = (ym && /^\d{4}-\d{2}$/.test(ym) ? ym : now.slice(0, 7)).split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - 14 * 3600_000); // tz slack
  const end = new Date(Date.UTC(y, m, 1) + 14 * 3600_000);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { y, m, start, end, daysInMonth, key: `${y}-${String(m).padStart(2, "0")}` };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m: ym } = await searchParams;
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const { y, m, start, end, daysInMonth, key } = monthRange(tenant.timezone, ym);
  const inMonth = (d: Date) => dayKeyInTz(d, tenant.timezone).startsWith(key);

  const [orders, sessions, bookings, newClients, creditsOwed] = await Promise.all([
    db.order.findMany({ where: { tenantId: tenant.id, status: "PAID", createdAt: { gte: start, lt: end } }, include: { items: true } }),
    db.classSession.findMany({ where: { tenantId: tenant.id, startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, include: { _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } } }),
    db.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: start, lt: end }, status: { in: ["BOOKED", "CHECKED_IN"] } } }),
    db.client.count({ where: { tenantId: tenant.id, createdAt: { gte: start, lt: end } } }),
    db.clientPackage.aggregate({ where: { tenantId: tenant.id, creditsLeft: { gt: 0 }, expiresAt: { gt: new Date() } }, _sum: { creditsLeft: true } }),
  ]);

  const monthOrders = orders.filter((o) => inMonth(o.createdAt));
  const monthSessions = sessions.filter((s) => inMonth(s.startsAt));

  const revenue = monthOrders.reduce((s, o) => s + Number(o.total), 0);
  const capTotal = monthSessions.reduce((s, x) => s + x.capacity, 0);
  const bookedTotal = monthSessions.reduce((s, x) => s + x._count.bookings, 0);
  const occupancy = capTotal ? Math.round((bookedTotal / capTotal) * 100) : 0;

  // Daily revenue series
  const byDay = new Array<number>(daysInMonth).fill(0);
  for (const o of monthOrders) byDay[Number(dayKeyInTz(o.createdAt, tenant.timezone).slice(8)) - 1] += Number(o.total);
  const maxDay = Math.max(...byDay, 1);

  // Area chart geometry (W×H with padding)
  const W = 720, H = 200, P = 8;
  const pts = byDay.map((v, i) => [P + (i / (daysInMonth - 1)) * (W - 2 * P), H - P - (v / maxDay) * (H - 2 * P)]);
  const line = pts.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${(W - P).toFixed(1)},${H - P} L${P},${H - P} Z`;

  // Donut: revenue by item kind
  const kindTotals = new Map<string, number>();
  for (const o of monthOrders) for (const it of o.items) {
    kindTotals.set(it.kind, (kindTotals.get(it.kind) ?? 0) + Number(it.unitPrice) * it.qty);
  }
  const donutSpec: Array<[string, string, string]> = [
    ["package", "Packages", "#8B5CF6"],
    ["product", "Merchandise", "#F97316"],
    ["dropin", "Drop-ins", "#22A565"],
  ];
  const donutTotal = [...kindTotals.values()].reduce((a, b) => a + b, 0);
  const R = 62, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = donutSpec
    .map(([k, label, color]) => {
      const v = kindTotals.get(k) ?? 0;
      const frac = donutTotal ? v / donutTotal : 0;
      const seg = { label, color, v, frac, offset: acc };
      acc += frac;
      return seg;
    })
    .filter((s) => s.v > 0);

  const monthLabel = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Studio finance, customer &amp; operational performance</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/analytics?m=${prev}`} className="rounded-xl border border-line-2 bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:bg-raised">←</a>
          <span className="rounded-xl border border-line-2 bg-surface px-4 py-2 text-sm font-bold text-ink">{monthLabel}</span>
          <a href={`/analytics?m=${next}`} className="rounded-xl border border-line-2 bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:bg-raised">→</a>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} tone="o" label="Total revenue" value={fmt.format(revenue)} />
        <Kpi icon={CalendarCheck} tone="p" label="Bookings" value={String(bookings)} />
        <Kpi icon={Gauge} tone="g" label="Avg occupancy" value={`${occupancy}%`} />
        <Kpi icon={Users} tone="b" label="New clients" value={String(newClients)} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          ["Classes held", String(monthSessions.length)],
          ["Packages sold", String(monthOrders.reduce((s, o) => s + o.items.filter((i) => i.kind === "package").reduce((a, i2) => a + i2.qty, 0), 0))],
          ["Orders", String(monthOrders.length)],
          ["Credits owed", String(creditsOwed._sum.creditsLeft ?? 0)],
        ] as const).map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line-2 bg-surface px-[18px] py-4 shadow-[var(--shadow-card)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{l}</div>
            <div className="mt-1 font-display text-[20px] font-extrabold text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue area chart */}
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Revenue" title="Daily Trends" sub={`${monthLabel} — collected per day`} />
          <div className="p-5">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily revenue chart">
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={P} x2={W - P} y1={H - P - f * (H - 2 * P)} y2={H - P - f * (H - 2 * P)} stroke="#ECECEE" strokeWidth="1" />
              ))}
              <path d={area} fill="url(#rev)" />
              <path d={line} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <div className="mt-2 flex justify-between text-[11px] text-muted"><span>{monthLabel.split(" ")[0]} 1</span><span>{monthLabel.split(" ")[0]} {daysInMonth}</span></div>
          </div>
        </Card>

        {/* Donut */}
        <Card>
          <CardHeader eyebrow="Sales mix" title="Revenue Breakdown" />
          <div className="flex flex-col items-center gap-4 p-5">
            <div className="relative">
              <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Revenue breakdown">
                <circle cx="85" cy="85" r={R} fill="none" stroke="#F2F2F4" strokeWidth="18" />
                {segs.map((s) => (
                  <circle
                    key={s.label} cx="85" cy="85" r={R} fill="none" stroke={s.color} strokeWidth="18"
                    strokeDasharray={`${(s.frac * C).toFixed(1)} ${C.toFixed(1)}`}
                    strokeDashoffset={(-s.offset * C).toFixed(1)}
                    transform="rotate(-90 85 85)" strokeLinecap="butt"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-[19px] font-extrabold text-ink">{fmt.format(donutTotal)}</div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">This month</div>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-1.5">
              {segs.length === 0 && <li className="text-center text-[13px] text-muted">No sales this month yet.</li>}
              {segs.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[13px]">
                  <span className="inline-flex items-center gap-2 text-ink-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="font-semibold text-ink">{fmt.format(s.v)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
