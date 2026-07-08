import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { dayKeyInTz, timeInTz, weekDays } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const offset = Number(w ?? 0) || 0;
  const tenant = await getCurrentTenant();
  const days = weekDays(tenant.timezone, offset);
  const rangeStart = new Date(`${days[0]}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1); // tz slack
  const rangeEnd = new Date(`${days[6]}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const sessions = await db.classSession.findMany({
    where: { tenantId: tenant.id, startsAt: { gte: rangeStart, lt: rangeEnd }, status: { not: "CANCELLED" } },
    include: { classType: true, instructor: true, _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
    orderBy: { startsAt: "asc" },
  });
  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const k = dayKeyInTz(s.startsAt, tenant.timezone);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const monthLabel = new Date(`${days[0]}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Schedule</h1>
          <p className="mt-1 text-sm text-muted">{monthLabel} · all times in {tenant.timezone.replace("_", " ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/schedule?w=${offset - 1}`} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronLeft className="size-4" /></Link>
          <Link href="/schedule" className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Today</Link>
          <Link href={`/schedule?w=${offset + 1}`} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronRight className="size-4" /></Link>
          <Link href="/schedule/new" className="ml-2 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
            <Plus className="size-4" /> Add class
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const date = new Date(`${d}T12:00:00Z`);
          const isToday = d === todayKey;
          const daySessions = byDay.get(d) ?? [];
          return (
            <Card key={d} className={isToday ? "ring-2 ring-brand/30" : ""}>
              <div className="border-b border-line-2 px-3.5 py-3">
                <div className={`text-[10.5px] font-bold uppercase tracking-[0.08em] ${isToday ? "text-brand" : "text-muted"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`font-display text-lg font-extrabold ${isToday ? "text-brand" : "text-ink"}`}>{date.getUTCDate()}</div>
              </div>
              <div className="min-h-[120px] space-y-2 p-2.5">
                {daySessions.map((s) => (
                  <div key={s.id} className="rounded-xl border px-3 py-2.5" style={{ background: `${s.classType.color}14`, borderColor: `${s.classType.color}33` }}>
                    <div className="text-[12.5px] font-bold" style={{ color: s.classType.color }}>{s.classType.name}</div>
                    <div className="mt-0.5 text-[11.5px] font-medium text-ink-2">{timeInTz(s.startsAt, tenant.timezone)}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {s._count.bookings}/{s.capacity} booked{s.instructor ? ` · ${s.instructor.name.split(" ")[0]}` : ""}
                    </div>
                  </div>
                ))}
                {daySessions.length === 0 && <div className="px-2 py-4 text-center text-[11.5px] text-muted">—</div>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
