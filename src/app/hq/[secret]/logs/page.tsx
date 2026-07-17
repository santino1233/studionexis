import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";

export default async function HqLogs({ params, searchParams }: { params: Promise<{ secret: string }>; searchParams: Promise<{ q?: string }> }) {
  const { secret } = await params;
  const { q } = await searchParams;
  await assertHq(secret);
  const logs = await db.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { actor: { contains: q, mode: "insensitive" } }, { detail: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" }, take: 200,
  });
  const tenants = new Map((await db.tenant.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return (
    <div className="max-w-[1000px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Activity Logs</h1>
      <form method="get" className="mt-4"><input name="q" defaultValue={q ?? ""} placeholder="Filter actions, actors, details…" className="h-10 w-[340px] rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" /></form>
      <Card className="mt-4">
        <ul className="divide-y divide-line-2">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[12.5px]">
              <span className="min-w-0">
                <b className="text-ink">{l.actor}</b> <span className="rounded bg-line-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.action}</span>
                {l.detail && <span className="ml-1.5 text-muted">{l.detail}</span>}
                {l.tenantId && <span className="ml-1.5 text-brand">{tenants.get(l.tenantId) ?? l.tenantId}</span>}
              </span>
              <span className="shrink-0 text-[11px] text-muted">{l.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </li>
          ))}
          {logs.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">No log entries yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
