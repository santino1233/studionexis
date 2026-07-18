import Link from "next/link";
import { Bug } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
type Msg = { from: string; name: string; text: string; at: string };
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

// HQ ticket detail (Wave 16 B3): thread, triage, bug context.
export default async function HqTicket({ params }: { params: Promise<{ secret: string; tid: string }> }) {
  const { secret, tid } = await params;
  await assertHq(secret);
  const t = await db.supportTicket.findUnique({ where: { id: tid }, include: { tenant: { select: { id: true, name: true, slug: true } } } });
  if (!t) notFound();
  const ctx = (t.context ?? {}) as Record<string, string>;
  const back = `/support/${t.id}`;

  return (
    <div className="max-w-[1100px]">
      <Link href="/support" className="text-[12.5px] font-bold text-muted hover:text-ink">← Queue</Link>
      <div className="mt-1 flex flex-wrap items-center gap-2.5">
        <h1 className="font-display text-[24px] font-extrabold tracking-tight">{t.kind === "bug" ? <Bug className="mr-1 inline size-3.5 -mt-0.5 text-rose" /> : null}{t.subject}</h1>
        <Link href={`/t/${t.tenant.id}`} className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:text-ink">{t.tenant.name}</Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="max-h-[480px] space-y-3 overflow-y-auto p-5">
            {(t.messages as unknown as Msg[]).map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.from === "hq" ? "ml-auto bg-brand-wash" : "bg-raised"}`}>
                <div className="text-[10.5px] font-bold text-muted">{m.name} ({m.from}) · {new Date(m.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                <div className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-ink">{m.text}</div>
              </div>
            ))}
          </div>
          <form method="post" action="/api/hq/ops" className="flex gap-2 border-t border-line-2 p-4">
            <input type="hidden" name="op" value="ticket-reply" />
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="back" value={back} />
            <input name="text" required placeholder="Reply as StudioNexis Support…" className={field} />
            <button className="shrink-0 rounded-[10px] bg-brand px-4 text-sm font-bold text-white">Send</button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Triage" />
            <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
              <input type="hidden" name="op" value="ticket-update" />
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="back" value={back} />
              <div className="grid grid-cols-2 gap-2">
                <select name="status" defaultValue={t.status} className={field}>{["OPEN", "PENDING", "WAITING", "RESOLVED"].map((x) => <option key={x}>{x}</option>)}</select>
                <select name="priority" defaultValue={t.priority} className={field}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => <option key={x}>{x}</option>)}</select>
              </div>
              <input name="assignee" defaultValue={t.assignee ?? ""} placeholder="Assignee" className={field} />
              {t.kind === "bug" && (
                <>
                  <input name="githubIssue" defaultValue={t.githubIssue ?? ""} placeholder="GitHub issue URL" className={field} />
                  <input name="fixVersion" defaultValue={t.fixVersion ?? ""} placeholder="Fix version" className={field} />
                </>
              )}
              <textarea name="internalNotes" rows={3} defaultValue={t.internalNotes ?? ""} placeholder="Internal notes (never shown to the studio)" className={field} />
              <button className="w-full rounded-[10px] bg-ink py-2.5 text-[13px] font-bold text-canvas hover:opacity-90">Save triage</button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Auto-captured context" />
            <dl className="space-y-1.5 p-5 pt-0 text-[12.5px]">
              {Object.entries(ctx).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="font-bold uppercase text-[10px] tracking-wider text-muted">{k}</dt><dd className="break-all text-ink-2">{v}</dd></div>
              ))}
              <div><dt className="font-bold uppercase text-[10px] tracking-wider text-muted">created</dt><dd className="text-ink-2">{t.createdAt.toLocaleString()}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
