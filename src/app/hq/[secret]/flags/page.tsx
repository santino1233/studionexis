import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";
type Flag = { id: string; label: string; tenants: string[] };

export default async function HqFlags({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const [row, tenants] = await Promise.all([
    db.globalSetting.findUnique({ where: { key: "featureFlags" } }),
    db.tenant.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } }),
  ]);
  const flags = (row?.value ?? []) as Flag[];
  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Feature Flags</h1>
      <p className="mt-1 text-sm text-muted">Beta features for selected studios — reference them in code with hasFlag().</p>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Flags" />
          <ul className="divide-y divide-line-2">
            {flags.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-2 px-5 py-3">
                <span><b className="font-mono text-[13px] text-ink">{f.id}</b><span className="block text-[12px] text-muted">{f.label} · {f.tenants.length ? f.tenants.join(", ") : "nobody yet"}</span></span>
                <form method="post" action="/api/hq/ops"><input type="hidden" name="op" value="flag-save" /><input type="hidden" name="mode" value="delete" /><input type="hidden" name="fid" value={f.id} /><input type="hidden" name="back" value="/flags" /><button className="rounded-lg bg-line-2 px-2 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">✕</button></form>
              </li>
            ))}
            {flags.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No flags yet.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Create / update flag" sub="Same id overwrites — tenant slugs comma-separated" />
          <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="op" value="flag-save" />
            <input type="hidden" name="back" value="/flags" />
            <input name="fid" required placeholder="flag-id (e.g. new-reports)" className={field} />
            <input name="label" placeholder="Human label" className={field} />
            <input name="tenants" placeholder={`tenant slugs: ${tenants.slice(0, 3).map((t) => t.slug).join(", ")}…`} className={field} />
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">Save flag</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
