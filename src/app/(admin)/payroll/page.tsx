import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { configOf, tierPct } from "@/lib/earnings";

export const dynamic = "force-dynamic";

const MODES: Record<string, string> = {
  percent: "% of revenue",
  percent_tiered: "Tiered %",
  fixed_per_class: "Fixed / class",
  per_head: "Per head",
};

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await getSession();
  if (session?.role !== "OWNER") notFound();
  const fmt = moneyFormatter(tenant.currency);

  const now = new Date();
  const [y, mo] = /^\d{4}-\d{2}$/.test(m ?? "") ? m!.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const nav = (delta: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
    return `/payroll?m=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const [staff, taught] = await Promise.all([
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["OWNER", "STAFF", "INSTRUCTOR"] } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    db.classSession.findMany({
      where: { tenantId: tenant.id, status: "COMPLETED", instructorId: { not: null }, startsAt: { gte: start, lt: end } },
      select: { instructorId: true, revenue: true, instructorEarnings: true, startsAt: true, endsAt: true },
    }),
  ]);

  const byInstructor = new Map<string, { classes: number; revenue: number; frozen: number; minutes: number }>();
  for (const s of taught) {
    const cur = byInstructor.get(s.instructorId!) ?? { classes: 0, revenue: 0, frozen: 0, minutes: 0 };
    cur.classes += 1;
    cur.revenue += Number(s.revenue ?? 0);
    cur.frozen += Number(s.instructorEarnings ?? 0);
    cur.minutes += Math.max(0, (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
    byInstructor.set(s.instructorId!, cur);
  }

  const rows = staff.map((u) => {
    const t = byInstructor.get(u.id) ?? { classes: 0, revenue: 0, frozen: 0, minutes: 0 };
    const cfg = configOf(u);
    const retro = u.commissionMode === "percent_tiered" && (cfg.retroactive ?? false);
    const retroPct = retro ? tierPct(cfg.tiers, t.classes) : 0;
    const commission = retro ? (t.revenue * retroPct) / 100 : t.frozen;
    const hours = t.minutes / 60;
    const hourlyPay = hours * Number(u.hourlyRate);
    const base = Number(u.baseSalary);
    return {
      u, ...t, hours, hourlyPay, base, commission, retro, retroPct,
      total: base + hourlyPay + commission,
    };
  });
  const grand = rows.reduce((n, r) => n + r.total, 0);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Payroll</h1>
          <p className="mt-1 text-sm text-muted">Base salary + taught hours + commission per team member — completed classes only.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={nav(-1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink-2 hover:text-ink">←</Link>
          <span className="min-w-[150px] text-center text-[14.5px] font-bold text-ink">{monthLabel}</span>
          <Link href={nav(1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink-2 hover:text-ink">→</Link>
        </div>
      </div>

      <Card className="mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Member", "Commission plan", "Classes", "Hours", "Base", "Hourly pay", "Commission", "Total pay"].map((h, i) => (
                <th key={i} className={`px-[16px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted ${i >= 2 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[16px] py-[14px]">
                  <Link href={`/team/${r.u.id}`} className="text-[14px] font-semibold text-ink hover:text-brand">{r.u.name}</Link>
                  <div className="text-[11.5px] capitalize text-muted">{r.u.role.toLowerCase()}</div>
                </td>
                <td className="px-[16px] py-[14px]">
                  {r.u.role === "INSTRUCTOR" ? (
                    <span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2">
                      {MODES[r.u.commissionMode] ?? r.u.commissionMode}{r.retro ? ` · retro ${r.retroPct}%` : ""}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted">—</span>
                  )}
                </td>
                <td className="px-[16px] py-[14px] text-right text-[13px] text-ink-2">{r.classes || "—"}</td>
                <td className="px-[16px] py-[14px] text-right text-[13px] text-ink-2">{r.hours ? r.hours.toFixed(1) : "—"}</td>
                <td className="px-[16px] py-[14px] text-right text-[13px] text-ink-2">{r.base ? fmt.format(r.base) : "—"}</td>
                <td className="px-[16px] py-[14px] text-right text-[13px] text-ink-2">{r.hourlyPay ? fmt.format(r.hourlyPay) : "—"}</td>
                <td className="px-[16px] py-[14px] text-right text-[13px] font-semibold text-ink">{r.commission ? fmt.format(r.commission) : "—"}</td>
                <td className="px-[16px] py-[14px] text-right text-[14px] font-extrabold text-ink">{fmt.format(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <td colSpan={7} className="px-[16px] py-[14px] text-right text-[12px] font-bold uppercase tracking-wider text-muted">Total payroll</td>
              <td className="px-[16px] py-[14px] text-right font-display text-[17px] font-extrabold text-ink">{fmt.format(grand)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <p className="mt-4 text-[12px] text-muted">
        Commission uses each class&apos;s frozen figures from &ldquo;Mark completed&rdquo;. Retroactive tiered plans re-price the whole month at the final tier — shown live above.
        Hours = duration of completed classes taught × hourly rate; add reception hours manually for now.
      </p>
    </div>
  );
}
