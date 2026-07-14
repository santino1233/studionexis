import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { timeInTz } from "@/lib/tz";
import { configOf, tierPct } from "@/lib/earnings";

export const dynamic = "force-dynamic";

// The instructor portal's earnings view: their own classes and pay only.
export default async function MyEarningsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await getSession();
  if (!session || session.role !== "INSTRUCTOR") notFound();
  const fmt = moneyFormatter(tenant.currency);

  const me = await db.user.findFirstOrThrow({ where: { id: session.userId, tenantId: tenant.id } });
  const now = new Date();
  const [y, mo] = /^\d{4}-\d{2}$/.test(m ?? "") ? m!.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const nav = (delta: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
    return `/my-earnings?m=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const [classes, upcoming] = await Promise.all([
    db.classSession.findMany({
      where: { tenantId: tenant.id, instructorId: me.id, status: "COMPLETED", startsAt: { gte: start, lt: end } },
      include: { classType: true, bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.classSession.count({ where: { tenantId: tenant.id, instructorId: me.id, status: "SCHEDULED", startsAt: { gt: new Date() } } }),
  ]);

  const cfg = configOf(me);
  const retro = me.commissionMode === "percent_tiered" && (cfg.retroactive ?? false);
  const totalRevenue = classes.reduce((n, s) => n + Number(s.revenue ?? 0), 0);
  const frozen = classes.reduce((n, s) => n + Number(s.instructorEarnings ?? 0), 0);
  const retroPct = retro ? tierPct(cfg.tiers, classes.length) : 0;
  const commission = retro ? (totalRevenue * retroPct) / 100 : frozen;
  const minutes = classes.reduce((n, s) => n + (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000, 0);
  const hourlyPay = (minutes / 60) * Number(me.hourlyRate);
  const total = Number(me.baseSalary) + hourlyPay + commission;

  const stat = (label: string, value: string, hint?: string) => (
    <div className="rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1.5 font-display text-[24px] font-extrabold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">My Earnings</h1>
          <p className="mt-1 text-sm text-muted">Your completed classes and pay for the month. {upcoming} upcoming classes on your schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={nav(-1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink-2 hover:text-ink">←</Link>
          <span className="min-w-[150px] text-center text-[14.5px] font-bold text-ink">{monthLabel}</span>
          <Link href={nav(1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink-2 hover:text-ink">→</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("Classes taught", String(classes.length))}
        {stat("Commission", fmt.format(commission), retro ? `retroactive tier ${retroPct}%` : undefined)}
        {stat("Base + hourly", fmt.format(Number(me.baseSalary) + hourlyPay), `${(minutes / 60).toFixed(1)}h taught`)}
        {stat("Total pay", fmt.format(total))}
      </div>

      <Card className="mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Class", "Date", "People", "Class revenue", "Your earning"].map((h, i) => (
                <th key={i} className={`px-[16px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted ${i >= 2 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((s) => (
              <tr key={s.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[16px] py-[13px]">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full" style={{ background: s.classType.color }} />
                    <span className="text-[13.5px] font-semibold text-ink">{s.classType.name}</span>
                  </div>
                </td>
                <td className="px-[16px] py-[13px] text-[12.5px] text-ink-2">
                  {s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} · {timeInTz(s.startsAt, tenant.timezone)}
                </td>
                <td className="px-[16px] py-[13px] text-right text-[13px] text-ink-2">{s.bookings.reduce((n, b) => n + b.qty, 0)}</td>
                <td className="px-[16px] py-[13px] text-right text-[13px] text-ink-2">{fmt.format(Number(s.revenue ?? 0))}</td>
                <td className="px-[16px] py-[13px] text-right text-[13.5px] font-bold text-ink">{fmt.format(Number(s.instructorEarnings ?? 0))}</td>
              </tr>
            ))}
            {classes.length === 0 && <tr><td colSpan={5} className="px-[16px] py-12 text-center text-sm text-muted">No completed classes this month yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {retro && <p className="mt-4 text-[12px] text-muted">Your plan is retroactive tiered — per-class figures show the rate at the time; the commission card re-prices the whole month at your final tier.</p>}
    </div>
  );
}
