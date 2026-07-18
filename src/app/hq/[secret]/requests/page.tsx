import Link from "next/link";
import { Puzzle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";
import { featureRequests } from "@/lib/features";

export const dynamic = "force-dynamic";
const COLS: [string, string][] = [["NEW", "New"], ["REVIEWING", "Planned / Reviewing"], ["DONE", "Released"], ["DECLINED", "Declined"]];

export default async function HqRequests({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const tenants = await db.tenant.findMany({ select: { id: true, name: true, policies: true } });
  const items = tenants.flatMap((t) => featureRequests(t).map((r, idx) => ({ t, r, idx })));
  return (
    <div className="max-w-[1300px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Feature Requests</h1>
      <p className="mt-1 text-sm text-muted">Roadmap board — every request studios have filed, grouped by status.</p>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {COLS.map(([st, label]) => (
          <Card key={st} className="p-3">
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">{label} ({items.filter((i) => i.r.status === st).length})</div>
            <div className="space-y-2">
              {items.filter((i) => i.r.status === st).map(({ t, r, idx }) => (
                <div key={`${t.id}-${idx}`} className="rounded-xl border border-line-2 bg-surface p-3">
                  {r.text.startsWith("App request:") && <span className="mb-1 inline-block rounded-full bg-brand-wash px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand"><Puzzle className="inline size-3 -mt-0.5" /> App Store</span>}
                  <p className="text-[12.5px] leading-relaxed text-ink">{r.text.startsWith("App request:") ? r.text.slice("App request:".length).trim() : r.text}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <Link href={`/t/${t.id}`} className="text-[11px] font-bold text-brand hover:underline">{t.name}</Link>
                    <form method="post" action={`/api/hq/${t.id}`} className="flex gap-1">
                      <input type="hidden" name="action" value="request-status" />
                      <input type="hidden" name="idx" value={idx} />
                      <input type="hidden" name="back" value="/requests" />
                      <select name="status" defaultValue={r.status} className="h-7 rounded-md border border-line bg-surface px-1 text-[10.5px] outline-none">
                        {COLS.map(([s]) => <option key={s}>{s}</option>)}
                      </select>
                      <button className="rounded-md bg-line-2 px-2 text-[10.5px] font-bold text-ink-2">Set</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
