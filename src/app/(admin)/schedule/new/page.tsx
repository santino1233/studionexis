import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { dayKeyInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const tenant = await getCurrentTenant();
  const [types, instructors] = await Promise.all([
    db.classType.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "OWNER"] } }, orderBy: { name: "asc" } }),
  ]);
  const today = dayKeyInTz(new Date(), tenant.timezone);

  return (
    <div className="mx-auto max-w-[560px]">
      <Link href="/schedule" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to schedule
      </Link>
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Add a class</h1>
      <p className="mt-1 text-sm text-muted">Put a class on the calendar — clients can book it right away.</p>

      <Card className="mt-6">
        <form method="post" action="/api/sessions" className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
              Something was missing — pick a class type, date and time.
            </div>
          )}
          <div>
            <label className={label}>Class type *</label>
            <select name="classTypeId" required className={field}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.durationMin} min</option>)}
            </select>
            {types.length === 0 && <p className="mt-1.5 text-[12px] text-rose">No class types yet — <Link className="underline" href="/class-types">create one first</Link>.</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Date *</label>
              <input name="date" type="date" required defaultValue={today} className={field} />
            </div>
            <div>
              <label className={label}>Start time *</label>
              <input name="time" type="time" required defaultValue="09:00" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Instructor</label>
              <select name="instructorId" className={field} defaultValue="">
                <option value="">Unassigned</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Spots (blank = default)</label>
              <input name="capacity" type="number" min={1} className={field} placeholder="from class type" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Room / location</label>
              <input name="location" className={field} placeholder="e.g. Main studio" />
            </div>
            <div>
              <label className={label}>Repeat weekly</label>
              <select name="repeatWeeks" className={field} defaultValue="1">
                <option value="1">Just this once</option>
                {[2,3,4,6,8,12].map(n => <option key={n} value={n}>{`For ${n} weeks`}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/schedule" className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Cancel</Link>
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add to schedule</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
