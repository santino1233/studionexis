import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { slotsOf } from "@/lib/blueprint";
import MuscleMap from "@/components/muscle-map/MuscleMap";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TABS = ["general", "pricing", "schedule"] as const;

function csvValue(list: string[]) {
  return list.join(", ");
}

export default async function ClassTypeEditor({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; made?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "general";
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);

  const [ct, instructors, upcoming] = await Promise.all([
    db.classType.findFirst({ where: { id, tenantId: tenant.id } }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "OWNER"] } }, orderBy: { name: "asc" } }),
    db.classSession.count({ where: { tenantId: tenant.id, classTypeId: id, startsAt: { gt: new Date() }, status: "SCHEDULED" } }),
  ]);
  if (!ct) notFound();
  const slots = slotsOf(ct);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/class-types" className="text-[12.5px] font-bold text-muted hover:text-ink">← Class types</Link>
      <div className="mt-1 flex items-center gap-3">
        <span className="size-3.5 rounded-full" style={{ background: ct.color }} />
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">{ct.name}</h1>
        <span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-2">{ct.kind.toLowerCase()}</span>
        {!ct.active && <span className="rounded-full bg-rose/10 px-2.5 py-1 text-[11px] font-bold text-rose">Archived</span>}
      </div>
      <p className="mt-1 text-sm text-muted">The blueprint for this class — what it is, what it costs, and when it repeats on the schedule.</p>

      {sp.saved && (
        <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">
          Saved{sp.made && Number(sp.made) > 0 ? <> — {sp.made} upcoming session{Number(sp.made) === 1 ? "" : "s"} added to the schedule.</> : "."}
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {sp.error === "phototype" ? "Hero image must be a JPG, PNG or WebP under 5 MB." : sp.error === "slot" ? "Pick a day and a valid time for the slot." : "Something didn't save — check the fields."}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-line-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/class-types/${ct.id}?tab=${t}`}
            className={`rounded-t-[10px] px-4 py-2.5 text-[13px] font-bold capitalize ${tab === t ? "border border-b-0 border-line-2 bg-surface text-ink" : "text-muted hover:text-ink"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "general" && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Basics" sub="Shown on the schedule and your booking page" />
            <form method="post" action={`/api/class-types/${ct.id}`} className="space-y-3.5 p-5">
              <input type="hidden" name="section" value="general" />
              <div>
                <label className={label}>Name</label>
                <input name="name" required defaultValue={ct.name} className={field} />
              </div>
              <div>
                <label className={label}>Description</label>
                <textarea name="description" rows={3} defaultValue={ct.description ?? ""} placeholder="What clients should expect" className="w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Format</label>
                  <select name="kind" defaultValue={ct.kind} className={field}>
                    <option value="GROUP">Group</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Difficulty</label>
                  <select name="difficulty" defaultValue={ct.difficulty} className={field}>
                    <option value="ALL_LEVELS">All levels</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={label}>Minutes</label>
                  <input name="durationMin" type="number" min={10} defaultValue={ct.durationMin} className={field} />
                </div>
                <div>
                  <label className={label}>Capacity</label>
                  <input name="capacity" type="number" min={1} defaultValue={ct.capacity} className={field} />
                </div>
                <div>
                  <label className={label}>Color</label>
                  <input name="color" type="color" defaultValue={ct.color} className="h-10 w-full cursor-pointer rounded-[10px] border border-line bg-surface p-1" />
                </div>
              </div>
              <div>
                <label className={label}>Benefits <span className="normal-case tracking-normal">(comma-separated)</span></label>
                <input name="benefits" defaultValue={csvValue(ct.benefits)} placeholder="Core strength, Posture, Flexibility" className={field} />
              </div>
              <div>
                <label className={label}>Good for</label>
                <input name="goodFor" defaultValue={csvValue(ct.goodFor)} placeholder="Beginners, Desk workers, Runners" className={field} />
              </div>
              <div>
                <label className={label}>Tags</label>
                <input name="tags" defaultValue={csvValue(ct.tags)} placeholder="Reformer, Low impact" className={field} />
              </div>
              <div>
                <label className={label}>Equipment</label>
                <input name="equipment" defaultValue={csvValue(ct.equipment)} placeholder="Reformer, Magic circle, Grip socks" className={field} />
              </div>
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save basics</button>
            </form>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Muscle focus" sub="Tap the body map — shows on the class page" />
              <form method="post" action={`/api/class-types/${ct.id}`} className="p-5">
                <input type="hidden" name="section" value="muscles" />
                <MuscleMap initial={ct.muscles} />
                <button className="mt-4 w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save muscle focus</button>
              </form>
            </Card>

            <Card>
              <CardHeader title="Hero image" sub="Banner for this class on your booking page" />
              <div className="p-5">
                {ct.heroImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ct.heroImage} alt={ct.name} className="mb-3 h-40 w-full rounded-xl object-cover" />
                )}
                <form method="post" action="/api/media/upload" encType="multipart/form-data" className="flex items-center gap-3">
                  <input type="hidden" name="kind" value="classhero" />
                  <input type="hidden" name="classTypeId" value={ct.id} />
                  <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" required className="flex-1 text-[13px] text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-line-2 file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-ink-2" />
                  <button className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-ink">{ct.heroImage ? "Replace" : "Upload"}</button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Drop-in price" sub="Charged at checkout when no package credit is used" />
            <form method="post" action={`/api/class-types/${ct.id}`} className="space-y-3.5 p-5">
              <input type="hidden" name="section" value="pricing" />
              <div>
                <label className={label}>Price ({tenant.currency})</label>
                <input name="price" type="number" step="0.01" min={0} defaultValue={Number(ct.price)} className={field} />
              </div>
              <p className="text-[12.5px] text-muted">Currently {fmt.format(Number(ct.price))} per visit. Class packages (credit bundles) are managed under <Link href="/packages" className="font-bold text-brand hover:underline">Packages</Link>.</p>
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save pricing</button>
            </form>
          </Card>
        </div>
      )}

      {tab === "schedule" && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader title="Defaults" sub="Applied to every session this blueprint creates" />
              <form method="post" action={`/api/class-types/${ct.id}`} className="space-y-3.5 p-5">
                <input type="hidden" name="section" value="schedule" />
                <div>
                  <label className={label}>Default instructor</label>
                  <select name="defaultInstructorId" defaultValue={ct.defaultInstructorId ?? ""} className={field}>
                    <option value="">— None —</option>
                    {instructors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Valid from</label>
                    <input name="validFrom" type="date" defaultValue={ct.validFrom ? ct.validFrom.toISOString().slice(0, 10) : ""} className={field} />
                  </div>
                  <div>
                    <label className={label}>Valid until</label>
                    <input name="validTo" type="date" defaultValue={ct.validTo ? ct.validTo.toISOString().slice(0, 10) : ""} className={field} />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 text-[13.5px] font-medium text-ink-2">
                  <input type="checkbox" name="publicByDefault" defaultChecked={ct.publicByDefault} className="size-4 accent-[var(--color-brand)]" />
                  New sessions are public (bookable by clients)
                </label>
                <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save defaults</button>
              </form>
            </Card>

            <Card>
              <CardHeader title="Skip dates" sub="Holidays or one-off closures — no sessions created" />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap gap-1.5">
                  {ct.exceptionDates.map((d) => (
                    <form key={d} method="post" action={`/api/class-types/${ct.id}`} className="inline">
                      <input type="hidden" name="section" value="exception-remove" />
                      <input type="hidden" name="date" value={d} />
                      <button className="inline-flex items-center gap-1.5 rounded-full bg-line-2 px-2.5 py-1 text-[11.5px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">{d} ×</button>
                    </form>
                  ))}
                  {ct.exceptionDates.length === 0 && <span className="text-[12.5px] text-muted">No skip dates.</span>}
                </div>
                <form method="post" action={`/api/class-types/${ct.id}`} className="flex gap-2">
                  <input type="hidden" name="section" value="exception-add" />
                  <input name="date" type="date" required className={field} />
                  <button className="shrink-0 rounded-[10px] bg-line-2 px-4 text-[12.5px] font-bold text-ink-2 hover:text-ink">Add</button>
                </form>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Recurring slots" sub={`Sessions are created ~4 weeks ahead automatically · ${upcoming} upcoming now`} />
            <div className="space-y-4 p-5">
              {DAYS.map((dayName, day) => {
                const daySlots = slots.map((s, idx) => ({ ...s, idx })).filter((s) => s.day === day);
                if (daySlots.length === 0) return null;
                return (
                  <div key={day}>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">{dayName}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {daySlots.sort((a, b) => a.time.localeCompare(b.time)).map((s) => (
                        <form key={s.idx} method="post" action={`/api/class-types/${ct.id}`} className="inline">
                          <input type="hidden" name="section" value="slot-remove" />
                          <input type="hidden" name="idx" value={s.idx} />
                          <button className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1.5 text-[12px] font-bold text-brand hover:bg-rose/10 hover:text-rose" title="Remove slot">
                            {s.time}{s.cap ? <span className="font-medium opacity-70">· cap {s.cap}</span> : null} ×
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                );
              })}
              {slots.length === 0 && <p className="text-[12.5px] text-muted">No recurring slots yet — add the weekly times below and the schedule fills itself.</p>}

              <form method="post" action={`/api/class-types/${ct.id}`} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 border-t border-line-2 pt-4">
                <input type="hidden" name="section" value="slot-add" />
                <div>
                  <label className={label}>Day</label>
                  <select name="day" className={field}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Time</label>
                  <input name="time" type="time" required className={`${field} w-[110px]`} />
                </div>
                <div>
                  <label className={label}>Cap</label>
                  <input name="cap" type="number" min={1} placeholder={String(ct.capacity)} className={`${field} w-[70px]`} title="Capacity override for this slot (optional)" />
                </div>
                <button className="h-10 rounded-[10px] bg-brand px-4 text-sm font-bold text-white hover:bg-brand-ink">Add</button>
              </form>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-8 border-t border-line-2 pt-5">
        <form method="post" action={`/api/class-types/${ct.id}`}>
          <input type="hidden" name="section" value={ct.active ? "archive" : "restore"} />
          <button className={`rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold ${ct.active ? "bg-rose/10 text-rose hover:bg-rose/20" : "bg-green-wash text-green"}`}>
            {ct.active ? "Archive class type" : "Restore class type"}
          </button>
        </form>
        {ct.active && <p className="mt-2 text-[12px] text-muted">Archiving hides it from the list and stops new sessions being created. Existing sessions stay on the schedule.</p>}
      </div>
    </div>
  );
}
