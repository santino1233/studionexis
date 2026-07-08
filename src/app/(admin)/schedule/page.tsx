import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, UserCheck, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { computeSessionFinancials } from "@/lib/earnings";
import { dayKeyInTz, timeInTz, weekDays } from "@/lib/tz";

export const dynamic = "force-dynamic";

const PX_PER_HOUR = 64;

const statusTone: Record<string, string> = {
  BOOKED: "bg-blue-wash text-blue",
  CHECKED_IN: "bg-green-wash text-green",
  WAITLIST: "bg-brand-wash text-brand",
  CANCELLED: "bg-line-2 text-muted",
  LATE_CANCEL: "bg-rose/10 text-rose",
  NO_SHOW: "bg-rose/10 text-rose",
};
const statusLabel: Record<string, string> = {
  BOOKED: "Booked", CHECKED_IN: "Arrived", WAITLIST: "Waitlist",
  CANCELLED: "Cancelled", LATE_CANCEL: "Late cancel", NO_SHOW: "No show",
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string; i?: string; sel?: string; c?: string; checkout?: string }> }) {
  const { w, i: instructorFilter, sel, c, checkout } = await searchParams;
  const colorBy = c === "status" ? "status" : "format";
  const offset = Number(w ?? 0) || 0;
  const tenant = await getCurrentTenant();
  const days = weekDays(tenant.timezone, offset);
  const rangeStart = new Date(`${days[0]}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${days[6]}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { w: offset || undefined, i: instructorFilter, sel, c: c === "status" ? "status" : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== 0) p.set(k, String(v));
    const s = p.toString();
    return s ? `/schedule?${s}` : "/schedule";
  };

  const [sessions, instructors, timeBlocks] = await Promise.all([
    db.classSession.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: rangeStart, lt: rangeEnd },
        status: { not: "CANCELLED" },
        ...(instructorFilter ? { instructorId: instructorFilter } : {}),
      },
      include: {
        classType: true,
        instructor: true,
        bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN", "WAITLIST"] } }, include: { client: { select: { name: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "OWNER"] } }, orderBy: { name: "asc" } }),
    db.timeBlock.findMany({ where: { tenantId: tenant.id, startsAt: { gte: rangeStart, lt: rangeEnd } }, orderBy: { startsAt: "asc" } }),
  ]);

  const minutesInTz = (d: Date) => {
    const [h, m] = d.toLocaleTimeString("en-GB", { timeZone: tenant.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
    return h * 60 + m;
  };

  let minH = 8, maxH = 20;
  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const k = dayKeyInTz(s.startsAt, tenant.timezone);
    const startMin = minutesInTz(s.startsAt);
    const durMin = Math.max(30, (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
    minH = Math.min(minH, Math.floor(startMin / 60));
    maxH = Math.max(maxH, Math.ceil((startMin + durMin) / 60));
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const blocksByDay = new Map<string, typeof timeBlocks>();
  for (const b of timeBlocks) {
    const k = dayKeyInTz(b.startsAt, tenant.timezone);
    minH = Math.min(minH, Math.floor(minutesInTz(b.startsAt) / 60));
    maxH = Math.max(maxH, Math.ceil(minutesInTz(b.endsAt) / 60) || 24);
    blocksByDay.set(k, [...(blocksByDay.get(k) ?? []), b]);
  }
  const hours = Array.from({ length: maxH - minH }, (_, n) => minH + n);
  const gridH = hours.length * PX_PER_HOUR;
  const todayKey = dayKeyInTz(new Date(), tenant.timezone);
  const nowMin = minutesInTz(new Date());
  const rangeLabel = `${new Date(`${days[0]}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${days[6]}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const hourLabel = (h: number) => new Date(Date.UTC(2000, 0, 1, h)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });

  const selected = sel ? sessions.find((s) => s.id === sel) ?? null : null;
  const fmt = moneyFormatter(tenant.currency);
  const fin = selected
    ? selected.status === "COMPLETED" && selected.revenue != null
      ? { revenue: Number(selected.revenue), earnings: Number(selected.instructorEarnings ?? 0), rate: Number(selected.instructor?.commissionRate ?? 0), frozen: true }
      : { ...(await computeSessionFinancials(selected.id)), frozen: false }
    : null;
  const selActive = selected?.bookings.filter((b) => b.status === "BOOKED" || b.status === "CHECKED_IN") ?? [];
  const selWaitlist = selected?.bookings.filter((b) => b.status === "WAITLIST") ?? [];
  const legendTypes = [...new Map(sessions.map((s) => [s.classType.id, s.classType])).values()].slice(0, 8);

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-muted">View and manage all classes and bookings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={qs({ w: undefined })} className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Today</Link>
          <Link href={qs({ w: offset - 1 })} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronLeft className="size-4" /></Link>
          <Link href={qs({ w: offset + 1 })} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronRight className="size-4" /></Link>
          <span className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-bold text-ink">{rangeLabel}</span>
          <details className="relative ml-1">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">🔒 Block time</summary>
            <form method="post" action="/api/timeblocks" className="absolute right-0 z-40 mt-2 w-[290px] space-y-2.5 rounded-2xl border border-line-2 bg-surface p-4 shadow-lg">
              <input type="hidden" name="back" value={qs({})} />
              <input name="date" type="date" required defaultValue={todayKey} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-2">
                <input name="from" type="time" required defaultValue="12:00" className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                <input name="to" type="time" required defaultValue="14:00" className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
              </div>
              <input name="reason" placeholder="Reason (e.g. maintenance)" className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
              <button className="w-full rounded-[10px] bg-ink py-2.5 text-[13px] font-bold text-canvas hover:opacity-90">Block this time</button>
            </form>
          </details>
          <Link href="/schedule/new" className="ml-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
            <Plus className="size-4" /> Add Class
          </Link>
        </div>
      </div>

      {checkout === "done" && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-green/20 bg-green-wash px-4 py-2.5 text-[13.5px] font-bold text-green">
          ✓ Checked out &amp; checked in
        </div>
      )}

      {/* Color mode */}
      <div className="mb-2 flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        Color by
        <Link href={qs({ c: undefined })} className={`rounded-full px-3 py-1 text-[11.5px] font-bold normal-case tracking-normal ${colorBy === "format" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>Class</Link>
        <Link href={qs({ c: "status" })} className={`rounded-full px-3 py-1 text-[11.5px] font-bold normal-case tracking-normal ${colorBy === "status" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>Status</Link>
      </div>

      {/* Instructor filter */}
      {instructors.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href={qs({ i: undefined })} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${!instructorFilter ? "bg-brand text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`}>All instructors</Link>
          {instructors.map((u) => (
            <Link key={u.id} href={qs({ i: u.id })} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${instructorFilter === u.id ? "bg-brand text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`}>{u.name.split(" ")[0]}</Link>
          ))}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Calendar */}
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
          <div className="min-w-[840px]">
            <div className="grid border-b border-line-2" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div />
              {days.map((d) => {
                const date = new Date(`${d}T12:00:00Z`);
                const isToday = d === todayKey;
                return (
                  <div key={d} className="border-l border-line-2 px-2.5 py-2 text-center">
                    <div className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isToday ? "text-brand" : "text-muted"}`}>{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full font-display text-[15px] font-extrabold ${isToday ? "bg-brand text-white" : "text-ink"}`}>{date.getUTCDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div className="relative" style={{ height: gridH }}>
                {hours.map((h, n) => (
                  <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-semibold text-muted" style={{ top: n * PX_PER_HOUR }}>{n > 0 && hourLabel(h)}</div>
                ))}
              </div>
              {days.map((d) => {
                const isToday = d === todayKey;
                return (
                  <div key={d} className={`relative border-l border-line-2 ${isToday ? "bg-brand/[0.03]" : ""}`} style={{ height: gridH }}>
                    {hours.map((h, n) => n > 0 && <div key={h} className="absolute inset-x-0 border-t border-line-2" style={{ top: n * PX_PER_HOUR }} />)}
                    {isToday && nowMin >= minH * 60 && nowMin <= maxH * 60 && (
                      <div className="absolute inset-x-0 z-10 border-t-2 border-brand" style={{ top: (nowMin / 60 - minH) * PX_PER_HOUR }}>
                        <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-brand" />
                      </div>
                    )}
                    {(blocksByDay.get(d) ?? []).map((b) => {
                      const top = (minutesInTz(b.startsAt) / 60 - minH) * PX_PER_HOUR;
                      const height = Math.max(30, ((b.endsAt.getTime() - b.startsAt.getTime()) / 3600_000) * PX_PER_HOUR - 3);
                      return (
                        <form key={b.id} method="post" action={`/api/timeblocks/${b.id}`} className="absolute inset-x-1 z-10" style={{ top, height }}>
                          <input type="hidden" name="back" value={qs({})} />
                          <button
                            type="submit"
                            title="Click to unblock"
                            className="h-full w-full overflow-hidden rounded-lg border border-dashed border-rose/40 px-2 py-1.5 text-left"
                            style={{ background: "repeating-linear-gradient(45deg, color-mix(in srgb, #E5484D 8%, var(--color-surface)), color-mix(in srgb, #E5484D 8%, var(--color-surface)) 6px, var(--color-surface) 6px, var(--color-surface) 12px)" }}
                          >
                            <span className="block truncate text-[10.5px] font-bold text-rose">🔒 Blocked</span>
                            {height > 44 && <span className="block truncate text-[10px] text-muted">{b.reason ?? "Studio time"} · click to unblock</span>}
                          </button>
                        </form>
                      );
                    })}
                    {(byDay.get(d) ?? []).map((s, idx) => {
                      const startMin = minutesInTz(s.startsAt);
                      const durMin = Math.max(30, (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
                      const top = (startMin / 60 - minH) * PX_PER_HOUR;
                      const height = Math.max(40, (durMin / 60) * PX_PER_HOUR - 3);
                      const active = s.bookings.filter((b) => b.status !== "WAITLIST").length;
                      const names = s.bookings.filter((b) => b.status !== "WAITLIST").slice(0, 2).map((b) => b.client.name.split(" ")[0]);
                      const isSel = sel === s.id;
                      const blocked = s.status === "BLOCKED";
                      const completed = s.status === "COMPLETED";
                      const tone = colorBy === "status"
                        ? blocked ? "#E5484D" : completed ? "#22A565" : active >= s.capacity ? "#F97316" : "#3B82F6"
                        : s.classType.color;
                      return (
                        <Link
                          key={s.id}
                          href={qs({ sel: isSel ? undefined : s.id })}
                          className={`absolute inset-x-1 z-20 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 transition-all hover:z-30 hover:shadow-md ${isSel ? "z-30 ring-2 ring-brand" : ""} ${blocked ? "opacity-80" : ""}`}
                          style={{
                            top, height,
                            background: blocked
                              ? `repeating-linear-gradient(45deg, color-mix(in srgb, #E5484D 12%, var(--color-surface)), color-mix(in srgb, #E5484D 12%, var(--color-surface)) 6px, var(--color-surface) 6px, var(--color-surface) 12px)`
                              : `color-mix(in srgb, ${tone} 14%, var(--color-surface))`,
                            borderLeftColor: blocked ? "#E5484D" : tone,
                            marginLeft: (idx % 2) * 3,
                          }}
                        >
                          <div className="truncate text-[10px] font-semibold text-muted">{timeInTz(s.startsAt, tenant.timezone)} – {timeInTz(s.endsAt, tenant.timezone)}</div>
                          <div className="truncate text-[11.5px] font-bold leading-tight" style={{ color: blocked ? "#E5484D" : tone }}>
                            {blocked ? "🔒 " : completed ? "✓ " : !s.isPublic ? "🙈 " : ""}{s.classType.name}
                          </div>
                          {height > 56 && (
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-ink-2">
                              {s.instructor && <span className="inline-flex items-center gap-1"><span className="grid size-3.5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ background: s.classType.color }}>{s.instructor.name[0]}</span>{s.instructor.name.split(" ")[0]}</span>}
                              <span className="text-muted">{active}/{s.capacity}</span>
                            </div>
                          )}
                          {height > 84 && names.map((n) => (
                            <div key={n} className="flex items-center gap-1 truncate text-[9.5px] text-muted"><span className="size-1 rounded-full" style={{ background: s.classType.color }} />{n}</div>
                          ))}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail rail */}
        {selected && (
          <aside className="sticky top-20 w-[320px] shrink-0 rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between border-b border-line-2 p-5">
              <div>
                <h2 className="font-display text-[19px] font-extrabold tracking-tight text-ink">{selected.classType.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: selected.classType.color }}>{selected.classType.kind}</span>
                  {selected.classType.difficulty !== "ALL_LEVELS" && <span className="rounded-full bg-line-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-2">{selected.classType.difficulty}</span>}
                  {selActive.length >= selected.capacity && <span className="rounded-full bg-brand-wash px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">Full</span>}
                  {selected.status === "BLOCKED" && <span className="rounded-full bg-rose/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose">Blocked</span>}
                  {selected.status === "COMPLETED" && <span className="rounded-full bg-green-wash px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green">Completed</span>}
                  {!selected.isPublic && <span className="rounded-full bg-line-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-2">Hidden from public</span>}
                </div>
              </div>
              <Link href={qs({ sel: undefined })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-4" /></Link>
            </div>
            <div className="space-y-1.5 border-b border-line-2 p-5 text-[13px] text-ink-2">
              <div>📅 {selected.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              <div>🕐 {timeInTz(selected.startsAt, tenant.timezone)} – {timeInTz(selected.endsAt, tenant.timezone)}</div>
              {selected.instructor && <div>👤 {selected.instructor.name}</div>}
              <div>👥 <b className="text-ink">{selActive.length} / {selected.capacity}</b> booked{selWaitlist.length > 0 ? ` · ${selWaitlist.length} waitlisted` : ""}</div>
              {selected.location && <div>📍 {selected.location}</div>}
            </div>
            {fin && (
              <div className="grid grid-cols-2 gap-3 border-b border-line-2 p-4">
                <div className="rounded-xl bg-raised px-3 py-2.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted">Class revenue{fin.frozen ? "" : " (live)"}</div>
                  <div className="font-display text-[17px] font-extrabold text-ink">{fmt.format(fin.revenue)}</div>
                </div>
                <div className="rounded-xl bg-raised px-3 py-2.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted">Instructor earns{fin.rate ? ` (${fin.rate}%)` : ""}</div>
                  <div className="font-display text-[17px] font-extrabold" style={{ color: "var(--color-green)" }}>{fmt.format(fin.earnings)}</div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-b border-line-2 p-4">
              {selected.status === "SCHEDULED" && (
                <form method="post" action={`/api/sessions/${selected.id}`} className="w-full">
                  <input type="hidden" name="action" value="complete" />
                  <input type="hidden" name="back" value={qs({})} />
                  <button className="w-full rounded-xl bg-green-wash px-3 py-2 text-[12px] font-bold text-green hover:brightness-95">✓ Mark class completed</button>
                </form>
              )}
              <form method="post" action={`/api/sessions/${selected.id}`} className="w-full">
                <input type="hidden" name="action" value={selected.status === "BLOCKED" ? "unblock" : "block"} />
                <input type="hidden" name="back" value={qs({})} />
                <button className={`w-full rounded-xl px-3 py-2 text-[12px] font-bold ${selected.status === "BLOCKED" ? "bg-line-2 text-ink-2 hover:brightness-95" : "bg-rose/10 text-rose hover:brightness-95"}`}>
                  {selected.status === "BLOCKED" ? "🔓 Unblock this class" : "🔒 Block this class (hide from booking)"}
                </button>
              </form>
              <Link href={`/schedule/${selected.id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-[12.5px] font-bold text-white hover:bg-brand-ink"><Pencil className="size-3.5" /> Edit Session</Link>
              {selActive.some((b) => b.status === "BOOKED") && (
                <form method="post" action={`/api/sessions/${selected.id}`} className="flex-1">
                  <input type="hidden" name="action" value="checkin-all" />
                  <input type="hidden" name="back" value={qs({})} />
                  <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-wash px-3 py-2.5 text-[12.5px] font-bold text-green hover:brightness-95"><UserCheck className="size-3.5" /> Check In All</button>
                </form>
              )}
            </div>
            <div className="p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Attendees ({selActive.length})</div>
              <ul className="space-y-2">
                {selected.bookings.map((b) => (
                  <li key={b.id} className="rounded-xl bg-raised px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ink">{b.client.name}</span>
                      <span className="flex items-center gap-1.5">
                        {b.paymentMethod === "at_studio" && !b.orderId && <span className="text-[10px] font-bold uppercase text-rose">Unpaid</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                      </span>
                    </div>
                    {(b.status === "BOOKED" || b.status === "WAITLIST") && (
                      <div className="mt-2 flex gap-1.5">
                        {b.status === "BOOKED" && (
                          <>
                            <Link href={`/schedule/${selected.id}/checkout/${b.id}`} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-ink">Checkout</Link>
                            <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="checkin" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-green-wash px-2.5 py-1 text-[11px] font-bold text-green hover:brightness-95">Arrived</button></form>
                            <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="noshow" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-rose/10 px-2.5 py-1 text-[11px] font-bold text-rose hover:brightness-95">No show</button></form>
                          </>
                        )}
                        <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="cancel" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">Remove</button></form>
                      </div>
                    )}
                  </li>
                ))}
                {selected.bookings.length === 0 && <li className="py-4 text-center text-[12.5px] text-muted">Nobody booked yet.</li>}
              </ul>
            </div>
          </aside>
        )}
      </div>

      {/* Legend */}
      {legendTypes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 px-1">
          {legendTypes.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
              <span className="size-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
            </span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">✓ Completed</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">🔒 Blocked</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">🙈 Hidden from public</span>
        </div>
      )}

      {sessions.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted">Nothing on the calendar this week — <Link href="/schedule/new" className="font-bold text-brand hover:underline">add a class</Link>.</p>
      )}
    </div>
  );
}
