import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq, mrrOf } from "@/lib/hq";

export const dynamic = "force-dynamic";

// Platform analytics (Wave 16 B4): SaaS metrics + product usage.
export default async function HqAnalytics({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const now = Date.now();
  const d = (n: number) => new Date(now - n * 86400_000);

  const [tenants, suspended30, signups14, bookings14, packagesSold30, groupB, privB, staff, revLeader] = await Promise.all([
    db.tenant.findMany({ select: { id: true, name: true, plan: true, status: true, policies: true, createdAt: true } }),
    db.tenant.count({ where: { status: "SUSPENDED" } }),
    db.tenant.findMany({ where: { createdAt: { gt: d(14) } }, select: { createdAt: true } }),
    db.booking.findMany({ where: { createdAt: { gt: d(14) } }, select: { createdAt: true } }),
    db.orderItem.count({ where: { kind: "package", order: { createdAt: { gt: d(30) }, status: "PAID" } } }),
    db.booking.count({ where: { createdAt: { gt: d(30) }, session: { classType: { kind: "GROUP" } } } }),
    db.booking.count({ where: { createdAt: { gt: d(30) }, session: { classType: { kind: "PRIVATE" } } } }),
    db.user.findMany({ where: { role: { not: "SUPERADMIN" } }, select: { lastLoginAt: true } }),
    db.order.groupBy({ by: ["tenantId"], where: { status: "PAID", createdAt: { gt: d(30) } }, _sum: { total: true }, orderBy: { _sum: { total: "desc" } }, take: 8 }),
  ]);

  const active = tenants.filter((t) => t.status === "ACTIVE");
  const trials = tenants.filter((t) => t.status === "TRIAL");
  const mrr = tenants.reduce((n, t) => n + mrrOf(t), 0);
  const churn = tenants.length ? Math.round((suspended30 / tenants.length) * 100) : 0;
  const conv = tenants.length - trials.length > 0 ? Math.round((active.length / Math.max(1, active.length + suspended30)) * 100) : 0;
  const arpa = active.length ? mrr / active.length : 0;
  const ltv = churn > 0 ? arpa / (churn / 100) : arpa * 24;
  const dau = staff.filter((u) => u.lastLoginAt && u.lastLoginAt > d(1)).length;
  const wau = staff.filter((u) => u.lastLoginAt && u.lastLoginAt > d(7)).length;
  const mau = staff.filter((u) => u.lastLoginAt && u.lastLoginAt > d(30)).length;
  const nameOf = new Map(tenants.map((t) => [t.id, t.name]));

  const byDay = (rows: { createdAt: Date }[]) => {
    const m = new Map<string, number>();
    for (let i = 13; i >= 0; i--) m.set(d(i).toISOString().slice(0, 10), 0);
    for (const r of rows) { const k = r.createdAt.toISOString().slice(0, 10); if (m.has(k)) m.set(k, m.get(k)! + 1); }
    return [...m.entries()];
  };
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const tile = (l: string, v: string, hint?: string) => (
    <div className="rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{l}</div>
      <div className="mt-1.5 font-display text-[24px] font-extrabold text-ink">{v}</div>
      {hint && <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>}
    </div>
  );
  const bars = (rows: [string, number][], tone: string) => {
    const max = Math.max(1, ...rows.map(([, n]) => n));
    return (
      <div className="flex h-[110px] items-end gap-1 px-5 pb-4">
        {rows.map(([k, n]) => (
          <div key={k} className="flex-1 rounded-t" style={{ height: `${Math.max(3, (n / max) * 100)}px`, background: tone }} title={`${k}: ${n}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1200px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Platform Analytics</h1>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {tile("Studios", String(tenants.length), `${active.length} active · ${trials.length} trial`)}
        {tile("MRR", fmt.format(mrr), `ARR ${fmt.format(mrr * 12)}`)}
        {tile("Churn (all-time)", `${churn}%`, `${suspended30} suspended`)}
        {tile("Paid conversion", `${conv}%`)}
        {tile("ARPA", fmt.format(arpa), `LTV ≈ ${fmt.format(ltv)}`)}
        {tile("Staff DAU/WAU/MAU", `${dau}/${wau}/${mau}`)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card><CardHeader eyebrow="14 days" title="Signups / day" />{bars(byDay(signups14), "var(--color-brand)")}</Card>
        <Card><CardHeader eyebrow="14 days" title="Bookings / day (platform)" />{bars(byDay(bookings14), "#3B82F6")}</Card>
        <Card>
          <CardHeader eyebrow="30 days" title="Product usage" />
          <ul className="space-y-2 p-5 pt-1 text-[13px]">
            <li className="flex justify-between"><span className="text-ink-2">Packages sold</span><b>{packagesSold30}</b></li>
            <li className="flex justify-between"><span className="text-ink-2">Group bookings</span><b>{groupB}</b></li>
            <li className="flex justify-between"><span className="text-ink-2">Private bookings</span><b>{privB}</b></li>
            <li className="flex justify-between"><span className="text-ink-2">Group : Private</span><b>{privB > 0 ? `${(groupB / privB).toFixed(1)} : 1` : `${groupB} : 0`}</b></li>
          </ul>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader eyebrow="30 days" title="Revenue leaderboard" sub="Studio GMV — their sales through the platform" />
        <ul className="divide-y divide-line-2">
          {revLeader.map((r, i) => (
            <li key={r.tenantId} className="flex items-center justify-between px-5 py-3 text-[13.5px]">
              <span className="font-semibold text-ink">{i + 1}. {nameOf.get(r.tenantId) ?? r.tenantId}</span>
              <b className="text-ink">${Number(r._sum.total ?? 0).toLocaleString()}</b>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
