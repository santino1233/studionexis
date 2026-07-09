import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const field = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

export default async function ClassTypesPage() {
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const types = await db.classType.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Class Types</h1>
      <p className="mt-1 text-sm text-muted">The services your studio offers — each becomes a bookable class on the schedule.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Class", "Type", "Duration", "Capacity", "Price", "Sessions", ""].map((h, i) => (
                  <th key={i} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[15px]">
                    <Link href={`/class-types/${t.id}`} className="flex items-center gap-2.5">
                      <span className="size-3 shrink-0 rounded-full" style={{ background: t.color }} />
                      <span className="text-[14px] font-semibold text-ink hover:text-brand">{t.name}</span>
                    </Link>
                  </td>
                  <td className="px-[18px] py-[15px] text-[13px] capitalize text-ink-2">{t.kind.toLowerCase()}</td>
                  <td className="px-[18px] py-[15px] text-[13px] text-ink-2">{t.durationMin} min</td>
                  <td className="px-[18px] py-[15px] text-[13px] text-ink-2">{t.capacity}</td>
                  <td className="px-[18px] py-[15px] text-[13px] font-semibold text-ink">{fmt.format(Number(t.price))}</td>
                  <td className="px-[18px] py-[15px] text-[13px] text-muted">{t._count.sessions}</td>
                  <td className="px-[18px] py-[15px] text-right">
                    <Link href={`/class-types/${t.id}`} className="rounded-lg bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:text-ink">Edit blueprint</Link>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={7} className="px-[18px] py-12 text-center text-sm text-muted">No class types yet — add your first on the right.</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Add class type" sub="Name, length and size" />
          <form method="post" action="/api/class-types" className="space-y-3.5 p-5">
            <input name="name" required placeholder="e.g. Reformer Flow" className={`${field} w-full`} />
            <textarea name="description" rows={2} placeholder="What clients should expect (shows on your booking page)" className="w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10" />
            <select name="difficulty" className={`${field} w-full`}>
              <option value="ALL_LEVELS">All levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select name="kind" className={field}>
                <option value="GROUP">Group</option>
                <option value="PRIVATE">Private</option>
              </select>
              <input name="color" type="color" defaultValue="#F97316" className="h-10 w-full cursor-pointer rounded-[10px] border border-line bg-surface p-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Minutes</label>
                <input name="durationMin" type="number" defaultValue={60} min={10} className={`${field} w-full`} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Capacity</label>
                <input name="capacity" type="number" defaultValue={10} min={1} className={`${field} w-full`} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Price</label>
                <input name="price" type="number" step="0.01" defaultValue={0} min={0} className={`${field} w-full`} />
              </div>
            </div>
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add class type</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
