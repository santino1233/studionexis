import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, UserCheck, Pencil, Lock, LockOpen, Check, AlertTriangle, EyeOff, Calendar as CalIcon, Clock, User, Users, MapPin, StickyNote, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { computeSessionFinancials } from "@/lib/earnings";
import { dayKeyInTz, timeInTz, weekDays } from "@/lib/tz";
import { CheckoutPanel } from "@/components/pos/checkout-panel";

export const dynamic = "force-dynamic";

const PX_PER_HOUR = 84;

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

type Search = { v?: string; w?: string; d?: string; mo?: string; i?: string; sel?: string; c?: string; checkout?: string; co?: string; nw?: string; slot?: string };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = sp.v === "day" ? "day" : sp.v === "month" ? "month" : "week";
  const wOff = Number(sp.w ?? 0) || 0;
  const dOff = Number(sp.d ?? 0) || 0;
  const moOff = Number(sp.mo ?? 0) || 0;
  const { i: instructorFilter, sel, c, checkout } = sp;
  const colorBy = c === "status" ? "status" : "format";
  // Popups (Wave 12 Z2): co = checkout booking, nw = add-class ("1" or "YYYY-MM-DDTHH:MM"), slot = clicked empty slot.
  const co = checkout === "done" ? undefined : sp.co;
  const nw = sp.nw;
  const slotPick = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sp.slot ?? "") ? sp.slot : undefined;

  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const todayKey = dayKeyInTz(new Date(), tenant.timezone);

  // ── Visible date range per view ───────────────────────────────────────
  let days: string[];
  let rangeLabel: string;
  let monthKey = "";
  let monthGrid: string[][] = [];
  if (view === "day") {
    const base = new Date(new Date(`${todayKey}T00:00:00Z`).getTime() + dOff * 86400_000);
    days = [base.toISOString().slice(0, 10)];
    rangeLabel = base.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } else if (view === "month") {
    const [ty, tm] = todayKey.split("-").map(Number);
    const first = new Date(Date.UTC(ty, tm - 1 + moOff, 1));
    monthKey = first.toISOString().slice(0, 7);
    rangeLabel = first.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
    const startDow = (first.getUTCDay() + 6) % 7; // Monday-first grid
    const gridStart = new Date(first.getTime() - startDow * 86400_000);
    days = Array.from({ length: 42 }, (_, n) => new Date(gridStart.getTime() + n * 86400_000).toISOString().slice(0, 10));
    monthGrid = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7));
  } else {
    days = weekDays(tenant.timezone, wOff);
    rangeLabel = `${new Date(`${days[0]}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${days[6]}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  const rangeStart = new Date(`${days[0]}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${days[days.length - 1]}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      v: view === "week" ? undefined : view,
      w: wOff || undefined, d: dOff || undefined, mo: moOff || undefined,
      i: instructorFilter, sel, c: colorBy === "status" ? "status" : undefined,
      ...over,
    };
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
        bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN", "WAITLIST"] } }, include: { client: { select: { id: true, name: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "OWNER"] } }, orderBy: { name: "asc" } }),
    db.timeBlock.findMany({ where: { tenantId: tenant.id, startsAt: { gte: rangeStart, lt: rangeEnd } }, orderBy: { startsAt: "asc" } }),
  ]);
  const classTypes = (nw || slotPick) ? await db.classType.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } }) : [];

  const minutesInTz = (dt: Date) => {
    const [h, m] = dt.toLocaleTimeString("en-GB", { timeZone: tenant.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
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
  const nowMin = minutesInTz(new Date());
  const hourLabel = (h: number) => new Date(Date.UTC(2000, 0, 1, h)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });

  const selected = sel ? sessions.find((s) => s.id === sel) ?? null : null;
  const selActive = selected?.bookings.filter((b) => b.status === "BOOKED" || b.status === "CHECKED_IN") ?? [];
  const selWaitlist = selected?.bookings.filter((b) => b.status === "WAITLIST") ?? [];
  const selActiveQty = selActive.reduce((n, b) => n + b.qty, 0);
  const selWaitQty = selWaitlist.reduce((n, b) => n + b.qty, 0);
  const legendTypes = [...new Map(sessions.map((s) => [s.classType.id, s.classType])).values()].slice(0, 8);
  const fin = selected
    ? selected.status === "COMPLETED" && selected.revenue != null
      ? { revenue: Number(selected.revenue), earnings: Number(selected.instructorEarnings ?? 0), rate: Number(selected.instructor?.commissionRate ?? 0), label: "", frozen: true }
      : { ...(await computeSessionFinancials(selected.id)), frozen: false }
    : null;
  const addableClients = selected && selected.status !== "COMPLETED"
    ? (await db.client.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }))
        .filter((cl) => !selected.bookings.some((b) => b.client.id === cl.id))
    : [];

  const nav = (dir: number) =>
    view === "day" ? qs({ d: dOff + dir, sel: undefined })
    : view === "month" ? qs({ mo: moOff + dir, sel: undefined })
    : qs({ w: wOff + dir, sel: undefined });

  const blockStyle = (s: (typeof sessions)[number]) => {
    const blocked = s.status === "BLOCKED";
    const completed = s.status === "COMPLETED";
    const active = s.bookings.filter((b) => b.status !== "WAITLIST").reduce((n, b) => n + b.qty, 0);
    // Past class with attendees that was never settled — pulse until the
    // receptionist checks everyone out and marks it completed (commission!).
    const attention = s.status === "SCHEDULED" && s.startsAt < new Date() && active > 0;
    const tone = colorBy === "status"
      ? blocked ? "#E5484D" : completed ? "#22A565" : active >= s.capacity ? "#F97316" : "#3B82F6"
      : s.classType.color;
    return { blocked, completed, active, attention, tone };
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-muted">View and manage all classes and bookings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-line-2 p-1">
            {(["week", "day", "month"] as const).map((vv) => (
              <Link key={vv} href={`/schedule${vv === "week" ? "" : `?v=${vv}`}${instructorFilter ? `${vv === "week" ? "?" : "&"}i=${instructorFilter}` : ""}`}
                className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold capitalize ${view === vv ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
                {vv}
              </Link>
            ))}
          </div>
          <Link href={qs({ w: undefined, d: undefined, mo: undefined, sel: undefined })} className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Today</Link>
          <Link href={nav(-1)} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronLeft className="size-4" /></Link>
          <Link href={nav(1)} className="grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 hover:bg-raised"><ChevronRight className="size-4" /></Link>
          <span className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-bold text-ink">{rangeLabel}</span>
          <details className="relative ml-1">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised"><Lock className="size-3.5" /> Block time</summary>
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
          <Link href={qs({ nw: "1" })} className="ml-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
            <Plus className="size-4" /> Add Class
          </Link>
        </div>
      </div>

      {checkout === "done" && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-green/20 bg-green-wash px-4 py-2.5 text-[13.5px] font-bold text-green"><Check className="size-4 shrink-0" /> Checked out &amp; checked in</div>
      )}

      {view !== "month" && (
        <div className="mb-2 flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          Color by
          <Link href={qs({ c: undefined })} className={`rounded-full px-3 py-1 text-[11.5px] font-bold normal-case tracking-normal ${colorBy === "format" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>Class</Link>
          <Link href={qs({ c: "status" })} className={`rounded-full px-3 py-1 text-[11.5px] font-bold normal-case tracking-normal ${colorBy === "status" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>Status</Link>
        </div>
      )}

      {instructors.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href={qs({ i: undefined })} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${!instructorFilter ? "bg-brand text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`}>All instructors</Link>
          {instructors.map((u) => (
            <Link key={u.id} href={qs({ i: u.id })} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${instructorFilter === u.id ? "bg-brand text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`}>{u.name.split(" ")[0]}</Link>
          ))}
        </div>
      )}

      <div className="flex items-start gap-4">
        {view === "month" ? (
          /* ── MONTH VIEW ── */
          <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
            <div className="grid min-w-[900px] grid-cols-7 border-b border-line-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dw) => (
                <div key={dw} className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{dw}</div>
              ))}
            </div>
            {monthGrid.map((row, r) => (
              <div key={r} className="grid min-w-[900px] grid-cols-7 border-b border-line-2 last:border-0">
                {row.map((dk) => {
                  const inMonth = dk.startsWith(monthKey);
                  const isToday = dk === todayKey;
                  const list = byDay.get(dk) ?? [];
                  const dayHref = `/schedule?v=day&d=${Math.round((new Date(`${dk}T00:00:00Z`).getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) / 86400_000)}`;
                  return (
                    <Link key={dk} href={dayHref}
                      className={`min-h-[104px] border-l border-line-2 p-1.5 align-top transition-colors first:border-l-0 hover:bg-raised ${inMonth ? "" : "opacity-40"} ${isToday ? "bg-brand/[0.04]" : ""}`}>
                      <div className={`mb-1 grid size-6 place-items-center rounded-full text-[12px] font-extrabold ${isToday ? "bg-brand text-white" : "text-ink"}`}>{Number(dk.slice(8))}</div>
                      {list.slice(0, 4).map((s) => {
                        const st = blockStyle(s);
                        return (
                          <div key={s.id} className={`mb-0.5 truncate rounded border-l-2 px-1 text-[10px] font-semibold text-ink-2 ${st.attention ? "nx-attention" : ""}`} style={{ borderColor: st.tone, background: `color-mix(in srgb, ${st.tone} 10%, var(--color-surface))` }}>
                            {timeInTz(s.startsAt, tenant.timezone).replace(":00", "")} {s.classType.name} <span className="text-muted">{st.active}/{s.capacity}</span>
                          </div>
                        );
                      })}
                      {list.length > 4 && <div className="px-1 text-[10px] font-bold text-brand">+{list.length - 4} more</div>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* ── WEEK / DAY TIME GRID ── */
          <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
            <div className={view === "day" ? "" : "min-w-[1060px]"}>
              <div className="grid border-b border-line-2" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map((d) => {
                  const date = new Date(`${d}T12:00:00Z`);
                  const isToday = d === todayKey;
                  return (
                    <div key={d} className="border-l border-line-2 px-2.5 py-2 text-center">
                      <div className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isToday ? "text-brand" : "text-muted"}`}>{date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: view === "day" ? "long" : "short" })}</div>
                      <div className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full font-display text-[15px] font-extrabold ${isToday ? "bg-brand text-white" : "text-ink"}`}>{date.getUTCDate()}</div>
                    </div>
                  );
                })}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
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
                      {/* Click an empty slot → add a class or block it (Z2c) */}
                      {hours.map((h, n) => (
                        <Link key={`slot-${h}`} href={qs({ slot: `${d}T${String(h).padStart(2, "0")}:00`, sel: undefined })} title="Add a class or block this time"
                          className="group/slot absolute inset-x-0 z-0" style={{ top: n * PX_PER_HOUR, height: PX_PER_HOUR }}>
                          <span className="pointer-events-none absolute inset-0.5 hidden place-items-center rounded-lg border border-dashed border-brand/40 bg-brand/[0.05] text-[11px] font-bold text-brand group-hover/slot:grid">+ {hourLabel(h)}</span>
                        </Link>
                      ))}
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
                            <button type="submit" title="Click to unblock" className="h-full w-full overflow-hidden rounded-lg border border-dashed border-rose/40 px-2 py-1.5 text-left"
                              style={{ background: "repeating-linear-gradient(45deg, color-mix(in srgb, #E5484D 8%, var(--color-surface)), color-mix(in srgb, #E5484D 8%, var(--color-surface)) 6px, var(--color-surface) 6px, var(--color-surface) 12px)" }}>
                              <span className="flex items-center gap-1 truncate text-[10.5px] font-bold text-rose"><Lock className="size-3 shrink-0" /> Blocked</span>
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
                        const st = blockStyle(s);
                        const names = s.bookings.filter((b) => b.status !== "WAITLIST").slice(0, view === "day" ? 6 : 3).map((b) => b.client.name.split(" ")[0]);
                        const isSel = sel === s.id;
                        return (
                          <Link key={s.id} href={qs({ sel: isSel ? undefined : s.id })}
                            className={`absolute inset-x-1 z-20 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 transition-all hover:z-30 hover:shadow-md ${isSel ? "z-30 ring-2 ring-brand" : ""} ${st.blocked ? "opacity-80" : ""} ${st.attention ? "nx-attention" : ""}`}
                            style={{
                              top, height,
                              background: st.blocked
                                ? `repeating-linear-gradient(45deg, color-mix(in srgb, #E5484D 12%, var(--color-surface)), color-mix(in srgb, #E5484D 12%, var(--color-surface)) 6px, var(--color-surface) 6px, var(--color-surface) 12px)`
                                : `color-mix(in srgb, ${st.tone} 14%, var(--color-surface))`,
                              borderLeftColor: st.blocked ? "#E5484D" : st.tone,
                              marginLeft: (idx % 2) * 3,
                            }}>
                            <div className="truncate text-[10px] font-semibold text-muted">{timeInTz(s.startsAt, tenant.timezone)} – {timeInTz(s.endsAt, tenant.timezone)}</div>
                            <div className="truncate text-[11.5px] font-bold leading-tight" style={{ color: st.blocked ? "#E5484D" : st.tone }}>
                              {st.blocked ? <Lock className="mr-0.5 inline size-3 -mt-0.5" /> : st.completed ? <Check className="mr-0.5 inline size-3 -mt-0.5" /> : st.attention ? <AlertTriangle className="mr-0.5 inline size-3 -mt-0.5" /> : !s.isPublic ? <EyeOff className="mr-0.5 inline size-3 -mt-0.5" /> : null}{s.classType.name}
                            </div>
                            {height > 48 && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-ink-2">
                                {s.instructor && <span className="inline-flex items-center gap-1"><span className="grid size-3.5 place-items-center rounded-full text-[7px] font-bold text-white" style={{ background: st.tone }}>{s.instructor.name[0]}</span>{s.instructor.name.split(" ")[0]}</span>}
                                <span className="text-muted">{st.active}/{s.capacity}</span>
                              </div>
                            )}
                            {height > 76 && names.map((n) => (
                              <div key={n} className="flex items-center gap-1 truncate text-[9.5px] text-muted"><span className="size-1 rounded-full" style={{ background: st.tone }} />{n}</div>
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
        )}

        {/* ── DETAIL RAIL ── */}
        {selected && (
          <aside className="sticky top-20 w-[320px] shrink-0 rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between border-b border-line-2 p-5">
              <div>
                <h2 className="font-display text-[19px] font-extrabold tracking-tight text-ink">{selected.classType.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: selected.classType.color }}>{selected.classType.kind}</span>
                  {selected.classType.difficulty !== "ALL_LEVELS" && <span className="rounded-full bg-line-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-2">{selected.classType.difficulty}</span>}
                  {selActiveQty >= selected.capacity && <span className="rounded-full bg-brand-wash px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">Full</span>}
                  {selected.status === "BLOCKED" && <span className="rounded-full bg-rose/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose">Blocked</span>}
                  {selected.status === "COMPLETED" && <span className="rounded-full bg-green-wash px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green">Completed</span>}
                  {!selected.isPublic && <span className="rounded-full bg-line-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-2">Hidden from public</span>}
                </div>
              </div>
              <Link href={qs({ sel: undefined })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-4" /></Link>
            </div>
            {selected.status === "SCHEDULED" && selected.startsAt < new Date() && selActiveQty > 0 && (
              <div className="border-b border-line-2 bg-amber-500/10 px-5 py-3 text-[12.5px] font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="inline size-4 -mt-0.5 shrink-0" /> This class needs completing — check everyone in, take payment, then <b>Mark class completed</b> so the instructor gets paid.
              </div>
            )}
            <div className="space-y-1.5 border-b border-line-2 p-5 text-[13px] text-ink-2">
              <div className="flex items-center gap-1.5"><CalIcon className="size-3.5 shrink-0 text-muted" /> {selected.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              <div className="flex items-center gap-1.5"><Clock className="size-3.5 shrink-0 text-muted" /> {timeInTz(selected.startsAt, tenant.timezone)} – {timeInTz(selected.endsAt, tenant.timezone)}</div>
              {selected.instructor && <div className="flex items-center gap-1.5"><User className="size-3.5 shrink-0 text-muted" /> {selected.instructor.name}</div>}
              <div className="flex items-center gap-1.5"><Users className="size-3.5 shrink-0 text-muted" /> <b className="text-ink">{selActiveQty} / {selected.capacity}</b> booked{selWaitQty > 0 ? ` · ${selWaitQty} waitlisted` : ""}</div>
              {selected.location && <div className="flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-muted" /> {selected.location}</div>}
              {selected.note && <div className="flex items-center gap-1.5"><StickyNote className="size-3.5 shrink-0 text-muted" /> {selected.note}</div>}
            </div>
            {fin && (
              <div className="grid grid-cols-2 gap-3 border-b border-line-2 p-4">
                <div className="rounded-xl bg-raised px-3 py-2.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted">Class revenue{fin.frozen ? "" : " (live)"}</div>
                  <div className="font-display text-[17px] font-extrabold text-ink">{fmt.format(fin.revenue)}</div>
                </div>
                <div className="rounded-xl bg-raised px-3 py-2.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted">Instructor earns{fin.label ? ` (${fin.label})` : fin.rate ? ` (${fin.rate}%)` : ""}</div>
                  <div className="font-display text-[17px] font-extrabold" style={{ color: "var(--color-green)" }}>{fmt.format(fin.earnings)}</div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-b border-line-2 p-4">
              {selected.status === "SCHEDULED" && (
                <form method="post" action={`/api/sessions/${selected.id}`} className="w-full">
                  <input type="hidden" name="action" value="complete" />
                  <input type="hidden" name="back" value={qs({})} />
                  <button className="w-full rounded-xl bg-green-wash px-3 py-2 text-[12px] font-bold text-green hover:brightness-95"><Check className="inline size-4 -mt-0.5" /> Mark class completed</button>
                </form>
              )}
              <form method="post" action={`/api/sessions/${selected.id}`} className="w-full">
                <input type="hidden" name="action" value={selected.status === "BLOCKED" ? "unblock" : "block"} />
                <input type="hidden" name="back" value={qs({})} />
                <button className={`w-full rounded-xl px-3 py-2 text-[12px] font-bold ${selected.status === "BLOCKED" ? "bg-line-2 text-ink-2 hover:brightness-95" : "bg-rose/10 text-rose hover:brightness-95"}`}>
                  {selected.status === "BLOCKED" ? <><LockOpen className="inline size-4 -mt-0.5" /> Unblock this class</> : <><Lock className="inline size-4 -mt-0.5" /> Block this class (hide from booking)</>}
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
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Attendees ({selActiveQty})</div>
              <ul className="space-y-2">
                {selected.bookings.map((b) => (
                  <li key={b.id} className="rounded-xl bg-raised px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ink">{b.client.name}{b.qty > 1 && <span className="ml-1.5 rounded-full bg-line-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">×{b.qty}</span>}</span>
                      <span className="flex items-center gap-1.5">
                        {b.paymentMethod === "at_studio" && !b.orderId && <span className="text-[10px] font-bold uppercase text-rose">Unpaid</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                      </span>
                    </div>
                    {(b.status === "BOOKED" || b.status === "WAITLIST") && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {b.status === "BOOKED" && (
                          <>
                            <Link href={qs({ co: b.id })} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-ink">Checkout</Link>
                            <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="checkin" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-green-wash px-2.5 py-1 text-[11px] font-bold text-green hover:brightness-95">Arrived</button></form>
                            <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="noshow" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-rose/10 px-2.5 py-1 text-[11px] font-bold text-rose hover:brightness-95">No show</button></form>
                          </>
                        )}
                        <form method="post" action={`/api/bookings/${b.id}`}><input type="hidden" name="action" value="cancel" /><input type="hidden" name="back" value={qs({})} /><button className="rounded-lg bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">Remove</button></form>
                      </div>
                    )}
                    {b.status === "CHECKED_IN" && !b.orderId && b.paymentMethod !== "package_credit" && (
                      <div className="mt-2">
                        <Link href={qs({ co: b.id })} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-ink"><CreditCard className="inline size-3.5 -mt-0.5" /> Take payment</Link>
                      </div>
                    )}
                  </li>
                ))}
                {selected.bookings.length === 0 && <li className="py-4 text-center text-[12.5px] text-muted">Nobody booked yet.</li>}
              </ul>

              {/* Add attendee: existing client or quick-add (video spec X5) */}
              {selected.status !== "COMPLETED" && (
                <div className="mt-3 border-t border-line-2 pt-3">
                  {addableClients.length > 0 && (
                    <form method="post" action="/api/bookings" className="flex gap-1.5">
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input type="hidden" name="back" value={qs({})} />
                      <select name="clientId" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[12.5px] outline-none focus:border-brand">
                        {addableClients.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                      </select>
                      <button className="rounded-lg bg-ink px-3 text-[12px] font-bold text-canvas hover:opacity-90">Add</button>
                    </form>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11.5px] font-bold text-brand">+ New client (quick add)</summary>
                    <form method="post" action="/api/bookings" className="mt-2 space-y-1.5">
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input type="hidden" name="back" value={qs({})} />
                      <input name="quickName" required placeholder="Full name" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-brand" />
                      <input name="quickPhone" placeholder="Phone (optional)" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-brand" />
                      <button className="w-full rounded-lg bg-brand py-2 text-[12px] font-bold text-white hover:bg-brand-ink">Create &amp; book</button>
                    </form>
                  </details>
                </div>
              )}
              <Link href={`/schedule/${selected.id}`} className="mt-3 block text-center text-[12px] font-bold text-brand hover:underline">View full roster →</Link>
            </div>
          </aside>
        )}
      </div>

      {/* Legend */}
      {view !== "month" && legendTypes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 px-1">
          {legendTypes.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
              <span className="size-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
            </span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted"><Check className="size-3.5" /> Completed</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted"><Lock className="size-3.5" /> Blocked</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-600"><span className="nx-attention inline-block size-2.5 rounded-full bg-amber-500/30" /> Needs completion</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted"><EyeOff className="size-3.5" /> Hidden from public</span>
        </div>
      )}

      {sessions.length === 0 && view !== "month" && (
        <p className="mt-4 text-center text-sm text-muted">Nothing on the calendar — <Link href={qs({ nw: "1" })} className="font-bold text-brand hover:underline">add a class</Link>.</p>
      )}

      {/* ── POPUPS (Wave 12 Z2) ── */}
      {slotPick && (() => {
        const [sd, st] = slotPick.split("T");
        const endT = `${String(Math.min(23, Number(st.slice(0, 2)) + 1)).padStart(2, "0")}:00`;
        const when = `${new Date(`${sd}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" })} · ${hourLabel(Number(st.slice(0, 2)))}`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Link href={qs({ slot: undefined })} className="absolute inset-0 bg-black/50" aria-label="Close" />
            <div className="relative w-full max-w-[380px] rounded-2xl border border-line-2 bg-surface p-6 shadow-2xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Empty slot</div>
              <h2 className="mt-1 font-display text-[20px] font-extrabold tracking-tight text-ink">{when}</h2>
              <div className="mt-5 space-y-2.5">
                <Link href={qs({ slot: undefined, nw: slotPick })} className="block w-full rounded-xl bg-brand py-3 text-center text-[14px] font-bold text-white hover:bg-brand-ink"><Plus className="inline size-4 -mt-0.5" /> Add a class here</Link>
                <form method="post" action="/api/timeblocks">
                  <input type="hidden" name="back" value={qs({ slot: undefined })} />
                  <input type="hidden" name="date" value={sd} />
                  <input type="hidden" name="from" value={st} />
                  <input type="hidden" name="to" value={endT} />
                  <input type="hidden" name="reason" value="Blocked from calendar" />
                  <button className="w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-canvas hover:opacity-90"><Lock className="inline size-4 -mt-0.5" /> Block this hour</button>
                </form>
                <Link href={qs({ slot: undefined })} className="block py-1 text-center text-[12.5px] font-bold text-muted hover:text-ink">Cancel</Link>
              </div>
            </div>
          </div>
        );
      })()}

      {nw && (() => {
        const pre = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(nw) ? nw.split("T") : null;
        const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
        const flabel = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Link href={qs({ nw: undefined })} className="absolute inset-0 bg-black/50" aria-label="Close" />
            <div className="relative max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-line-2 bg-surface p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <h2 className="font-display text-[21px] font-extrabold tracking-tight text-ink">Add a class</h2>
                <Link href={qs({ nw: undefined })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-4" /></Link>
              </div>
              <form method="post" action="/api/sessions" className="mt-4 space-y-3.5">
                <input type="hidden" name="back" value={qs({ nw: undefined })} />
                <div>
                  <label className={flabel}>Class type</label>
                  <select name="classTypeId" required className={field}>
                    {classTypes.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.durationMin} min</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={flabel}>Date</label>
                    <input name="date" type="date" required defaultValue={pre ? pre[0] : (view === "day" ? days[0] : todayKey)} className={field} />
                  </div>
                  <div>
                    <label className={flabel}>Time</label>
                    <input name="time" type="time" required defaultValue={pre ? pre[1] : "09:00"} className={field} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={flabel}>Instructor</label>
                    <select name="instructorId" className={field}>
                      <option value="">— None —</option>
                      {instructors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={flabel}>Repeat weekly</label>
                    <select name="repeatWeeks" className={field}>
                      {[1, 2, 4, 8, 12].map((n) => <option key={n} value={n}>{n === 1 ? "Just once" : `${n} weeks`}</option>)}
                    </select>
                  </div>
                </div>
                <input name="location" placeholder="Room / location (optional)" className={field} />
                <label className="flex items-start gap-2.5 text-[13.5px] font-medium text-ink-2">
                  <input type="hidden" name="isPublic" value="0" />
                  <input type="checkbox" name="isPublic" value="1" defaultChecked className="mt-0.5 size-4 accent-[#F97316]" />
                  <span>Show in the public booking system<span className="block text-[11.5px] font-normal text-muted">Untick for private or internal sessions — clients won&apos;t see it.</span></span>
                </label>
                <button className="w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Add to calendar</button>
              </form>
            </div>
          </div>
        );
      })()}

      {co && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Link href={qs({ co: undefined })} className="absolute inset-0 bg-black/50" aria-label="Close" />
          <div className="relative max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-line-2 bg-surface p-6 shadow-2xl">
            <Link href={qs({ co: undefined })} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-4" /></Link>
            <CheckoutPanel bookingId={co} tenantId={tenant.id} currency={tenant.currency} timezone={tenant.timezone} back={qs({ co })} error={checkout} />
          </div>
        </div>
      )}
    </div>
  );
}
