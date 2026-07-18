"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, UserPlus, CalendarPlus, Ban, X } from "lucide-react";

type Opt = { id: string; name: string };
const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

// Quick-add popover in the top bar — add a client, add a class, or block a
// time in a modal without leaving the current page. Forms post to the existing
// endpoints with a `back` param so the studio lands back where they were.
export function QuickAdd({ classTypes = [], instructors = [], today = "" }: { classTypes?: (Opt & { durationMin: number })[]; instructors?: Opt[]; today?: string }) {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<null | "client" | "class" | "block">(null);
  const path = usePathname();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  const items = [
    { k: "client" as const, label: "Add a client", icon: UserPlus, sub: "New member profile" },
    { k: "class" as const, label: "Add a class", icon: CalendarPlus, sub: "Put a class on the calendar" },
    { k: "block" as const, label: "Block a time", icon: Ban, sub: "Mark the studio unavailable" },
  ];

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => setMenu((m) => !m)}
        className="grid size-9 place-items-center rounded-full bg-brand text-white transition-transform hover:scale-105 hover:bg-brand-ink"
        aria-label="Quick add"
        title="Quick add"
      >
        <Plus className={`size-[18px] transition-transform ${menu ? "rotate-45" : ""}`} />
      </button>

      {menu && (
        <div className="absolute right-0 top-11 z-50 w-[240px] overflow-hidden rounded-2xl border border-line-2 bg-surface p-1.5 shadow-[var(--shadow-card)]">
          {items.map((it) => (
            <button key={it.k} onClick={() => { setMenu(false); setModal(it.k); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-raised">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-wash text-brand"><it.icon className="size-[18px]" /></span>
              <span>
                <span className="block text-[13.5px] font-bold text-ink">{it.label}</span>
                <span className="block text-[11px] text-muted">{it.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px] sm:p-8" onClick={() => setModal(null)}>
          <div className="mt-6 w-full max-w-[460px] overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-2xl sm:mt-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line-2 px-5 py-3.5">
              <h2 className="font-display text-[17px] font-extrabold text-ink">
                {modal === "client" ? "Add a client" : modal === "class" ? "Add a class" : "Block a time"}
              </h2>
              <button onClick={() => setModal(null)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-[18px]" /></button>
            </div>

            {modal === "client" && (
              <form method="post" action="/api/clients" className="space-y-3 p-5">
                <input type="hidden" name="back" value={path} />
                <div><label className={label}>Full name *</label><input name="name" required autoFocus placeholder="e.g. Linh Nguyen" className={field} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Phone</label><input name="phone" placeholder="Phone" className={field} /></div>
                  <div><label className={label}>Email</label><input name="email" type="email" placeholder="Email" className={field} /></div>
                </div>
                <div><label className={label}>How did they find you?</label>
                  <select name="channel" defaultValue="" className={field}>
                    <option value="">—</option>
                    {["walk-in", "instagram", "facebook", "referral", "google", "zalo", "website"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button className="mt-1 w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Add client</button>
              </form>
            )}

            {modal === "class" && (
              classTypes.length === 0 ? (
                <div className="p-6 text-center text-[13.5px] text-muted">You need a class type first. <a href="/class-types" className="font-bold text-brand hover:underline">Create one →</a></div>
              ) : (
                <form method="post" action="/api/sessions" className="space-y-3 p-5">
                  <input type="hidden" name="back" value={path} />
                  <div><label className={label}>Class type *</label>
                    <select name="classTypeId" required className={field}>
                      {classTypes.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.durationMin} min</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Date *</label><input name="date" type="date" required defaultValue={today} className={field} /></div>
                    <div><label className={label}>Start time *</label><input name="time" type="time" required defaultValue="09:00" className={field} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Instructor</label>
                      <select name="instructorId" defaultValue="" className={field}>
                        <option value="">Unassigned</option>
                        {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div><label className={label}>Repeat (weeks)</label><input name="repeatWeeks" type="number" min={1} max={12} defaultValue={1} className={field} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                    <input type="hidden" name="isPublic" value="0" />
                    <input type="checkbox" name="isPublic" value="1" defaultChecked className="size-4 accent-[#F97316]" /> Show on the public booking site
                  </label>
                  <button className="mt-1 w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Add class</button>
                </form>
              )
            )}

            {modal === "block" && (
              <form method="post" action="/api/timeblocks" className="space-y-3 p-5">
                <input type="hidden" name="back" value={path} />
                <div><label className={label}>Date *</label><input name="date" type="date" required defaultValue={today} className={field} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>From *</label><input name="from" type="time" required defaultValue="09:00" className={field} /></div>
                  <div><label className={label}>To *</label><input name="to" type="time" required defaultValue="12:00" className={field} /></div>
                </div>
                <div><label className={label}>Reason</label><input name="reason" placeholder="e.g. Maintenance, holiday" className={field} /></div>
                <button className="mt-1 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-canvas hover:opacity-90">Block this time</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
