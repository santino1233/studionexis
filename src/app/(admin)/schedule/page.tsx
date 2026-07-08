import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { dayKeyInTz, timeInTz, weekDays } from "@/lib/tz";

export const dynamic = "force-dynamic";

const PX_PER_HOUR = 60;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const offset = Number(w ?? 0) || 0;
  const tenant = await getCurrentTenant();
  const days = weekDays(tenant.timezone, offset);
  const rangeStart = new Date(`${days[0]}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${days[6]}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const sessions = await db.classSession.findMany({
    where: { tenantId: tenant.id, startsAt: { gte: rangeStart, lt: rangeEnd }, status: { not: "CANCELLED" } },
    include: { classType: true, instructor: true, _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
    orderBy: { startsAt: "asc" },
  });

  // Wall-clock minutes in the studio tz for grid positioning
  const minutesInTz = (d: Date) => {
    const [h, m] = d
      .toLocaleTimeString("en-GB", { timeZone: tenant.timezone, hour: "2-digit", minute: "2-digit", hour12: false })
      .split(":").map(Number);
    return h * 60 + m;
  };

  type Item = { id: string; name: string; color: string; top: number; height: number; time: string; booked: number; capacity: number; instructor?: string };
  const byDay = new Map<string, Item[]>();
  let minH = 8, maxH = 20;
  for (const s of sessions) {
    const k = dayKeyInTz(s.startsAt, tenant.timezone);
    const startMin = minutesInTz(s.startsAt);
    const durMin = Math.max(30, (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
    minH = Math.min(minH, Math.floor(startMin / 60));
    maxH = Math.max(maxH, Math.ceil((startMin + durMin) / 60));
    byDay.set(k, [
      ...(byDay.get(k) ?? []),
      {
        id: s.id,
        name: s.classType.name,
        color: s.classType.color,
        top: (startMin / 60) * PX_PER_HOUR,
        height: Math.max(34, (durMin / 60) * PX_PER_HOUR - 3),
        time: timeInTz(s.startsAt, tenant.timezone),
        booked: s._count.bookings,
        capacity: s.capacity,
        instructor: s.instructor?.name.split(" ")[0],
      },
    ]);
  }
  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i);
  const gridH = hours.length * PX_PER_HOUR;
  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const nowMin = minutesInTz(new Date());
  const monthLabel = new Date(`${days[0]}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const hourLabel = (h: number) => new Date(Date.UTC(2000, 0, 1, h)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto max-w-[1360px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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

      <div className="overflow-x-auto rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
        <div className="min-w-[860px]">
          {/* Day headers */}
          <div className="grid border-b border-line-2" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div />
            {days.map((d) => {
              const date = new Date(`${d}T12:00:00Z`);
              const isToday = d === todayKey;
              return (
                <div key={d} className={`border-l border-line-2 px-3 py-2.5 ${isToday ? "bg-brand-wash" : ""}`}>
                  <div className={`text-[10.5px] font-bold uppercase tracking-[0.08em] ${isToday ? "text-brand" : "text-muted"}`}>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={`font-display text-[17px] font-extrabold leading-tight ${isToday ? "text-brand" : "text-ink"}`}>{date.getUTCDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            {/* Hour gutter */}
            <div className="relative" style={{ height: gridH }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] font-semibold text-muted" style={{ top: i * PX_PER_HOUR }}>
                  {i > 0 && hourLabel(h)}
                </div>
              ))}
            </div>

            {days.map((d) => {
              const isToday = d === todayKey;
              return (
                <div key={d} className={`relative border-l border-line-2 ${isToday ? "bg-brand/[0.025]" : ""}`} style={{ height: gridH }}>
                  {/* hour lines */}
                  {hours.map((h, i) => i > 0 && (
                    <div key={h} className="absolute inset-x-0 border-t border-line-2" style={{ top: i * PX_PER_HOUR }} />
                  ))}
                  {/* now line */}
                  {isToday && nowMin >= minH * 60 && nowMin <= maxH * 60 && (
                    <div className="absolute inset-x-0 z-10 border-t-2 border-brand" style={{ top: (nowMin / 60 - minH) * PX_PER_HOUR }}>
                      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-brand" />
                    </div>
                  )}
                  {/* class blocks */}
                  {(byDay.get(d) ?? []).map((s, i) => (
                    <Link
                      key={s.id}
                      href={`/schedule/${s.id}`}
                      className="absolute inset-x-1 z-20 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 transition-all hover:z-30 hover:shadow-md"
                      style={{
                        top: s.top - minH * PX_PER_HOUR,
                        height: s.height,
                        background: `color-mix(in srgb, ${s.color} 14%, var(--color-surface))`,
                        borderLeftColor: s.color,
                        marginLeft: (i % 2) * 3,
                      }}
                    >
                      <div className="truncate text-[11.5px] font-bold leading-tight" style={{ color: s.color }}>{s.name}</div>
                      <div className="truncate text-[10.5px] font-medium text-ink-2">{s.time}{s.instructor ? ` · ${s.instructor}` : ""}</div>
                      {s.height > 52 && (
                        <div className="mt-0.5 text-[10px] font-semibold text-muted">
                          {s.booked}/{s.capacity} booked
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sessions.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted">Nothing on the calendar this week — <Link href="/schedule/new" className="font-bold text-brand hover:underline">add a class</Link>.</p>
      )}
    </div>
  );
}
