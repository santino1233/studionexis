import { Card, CardHeader } from "@/components/ui/card";
import { Info, Rocket, ShieldAlert, Wrench, X } from "lucide-react";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

export default async function HqBroadcasts({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const [list, tenants] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="max-w-[1100px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Broadcasts</h1>
      <p className="mt-1 text-sm text-muted">Banners shown inside studio dashboards — maintenance alerts, security notices, product updates.</p>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="New broadcast" />
          <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="op" value="announce" />
            <input type="hidden" name="back" value="/broadcasts" />
            <input name="title" required placeholder="Title" className={field} />
            <textarea name="body" rows={3} required placeholder="Message shown to studios" className={field} />
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className={field}>
                <option value="info">Product update</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security notice</option>
                <option value="release">Release</option>
              </select>
              <input name="until" type="datetime-local" className={field} title="Show until (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select name="audience" className={field}>
                <option value="all">Everyone</option>
                <option value="trial">Trial studios</option>
                <option value="plan">One plan…</option>
                <option value="tenant">One studio…</option>
              </select>
              <select name="plan" className={field}>{["starter", "growth", "scale"].map((p) => <option key={p}>{p}</option>)}</select>
            </div>
            <select name="tenantId" className={field}>{tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">Broadcast</button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Sent" />
          <ul className="divide-y divide-line-2">
            {list.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <span>
                  <span className="block text-[13px] font-bold text-ink">{(() => { const I = a.kind === "maintenance" ? Wrench : a.kind === "security" ? ShieldAlert : a.kind === "release" ? Rocket : Info; return <I className="mr-1 inline size-3.5 -mt-0.5" />; })()}{a.title}</span>
                  <span className="text-[11.5px] text-muted">{a.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{a.activeUntil ? ` → until ${a.activeUntil.toLocaleDateString()}` : ""}</span>
                </span>
                <form method="post" action="/api/hq/ops"><input type="hidden" name="op" value="announce-delete" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="back" value="/broadcasts" /><button className="rounded-lg bg-line-2 px-2 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose"><X className="size-3" /></button></form>
              </li>
            ))}
            {list.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nothing sent yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
