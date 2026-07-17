import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const tone: Record<string, string> = { OPEN: "bg-blue-wash text-blue", PENDING: "bg-brand-wash text-brand", WAITING: "bg-purple-wash text-purple", RESOLVED: "bg-green-wash text-green" };
type Msg = { from: string; name: string; text: string; at: string };

// Studio Support Center (Wave 16 B3): tickets + bug reports w/ auto-context.
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ t?: string; ok?: string; error?: string }> }) {
  const { t: sel, ok, error } = await searchParams;
  const tenant = await getCurrentTenant();
  const tickets = await db.supportTicket.findMany({ where: { tenantId: tenant.id }, orderBy: { updatedAt: "desc" }, take: 50 });
  const open = sel ? tickets.find((x) => x.id === sel) : null;
  const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Support</h1>
      <p className="mt-1 text-sm text-muted">Message the StudioNexis team — we usually reply within a few hours. <b className="text-ink-2">We&apos;re still in beta, so we&apos;d genuinely love your feedback on anything that feels off.</b></p>
      {ok && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Sent! We&apos;re on it.</div>}
      {error && <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">Add a subject and a message.</div>}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {open ? (
            <Card>
              <div className="border-b border-line-2 p-5">
                <Link href="/support" className="text-[12px] font-bold text-muted hover:text-ink">← All tickets</Link>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="font-display text-[19px] font-extrabold text-ink">{open.subject}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${tone[open.status]}`}>{open.status}</span>
                  {open.kind === "bug" && <span className="rounded-full bg-rose/10 px-2.5 py-1 text-[10.5px] font-bold text-rose">BUG</span>}
                </div>
              </div>
              <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
                {(open.messages as unknown as Msg[]).map((m, i) => (
                  <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.from === "hq" ? "bg-brand-wash" : "ml-auto bg-raised"}`}>
                    <div className="text-[10.5px] font-bold text-muted">{m.from === "hq" ? "StudioNexis Support" : m.name} · {new Date(m.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    <div className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-ink">{m.text}</div>
                  </div>
                ))}
              </div>
              <form method="post" action="/api/support" className="flex gap-2 border-t border-line-2 p-4">
                <input type="hidden" name="mode" value="reply" />
                <input type="hidden" name="id" value={open.id} />
                <input name="text" required placeholder="Write a reply…" className={field} />
                <button className="shrink-0 rounded-[10px] bg-brand px-4 text-sm font-bold text-white">Send</button>
              </form>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Your tickets" sub="Click one to open the conversation" />
              <ul className="divide-y divide-line-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/support?t=${t.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-raised">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">{t.kind === "bug" ? "🐛 " : ""}{t.subject}</span>
                        <span className="text-[11.5px] text-muted">{t.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {(t.messages as unknown[]).length} message(s)</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${tone[t.status]}`}>{t.status}</span>
                    </Link>
                  </li>
                ))}
                {tickets.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">No tickets yet — start one on the right.</li>}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="New support ticket" sub="Questions, billing, how-tos" />
            <form method="post" action="/api/support" className="space-y-3 p-5">
              <input type="hidden" name="kind" value="support" />
              <input name="subject" required placeholder="Subject" className={field} />
              <textarea name="text" rows={4} required placeholder="How can we help?" className={field} />
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-ink">Send to support</button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Report a bug" sub="We auto-attach your browser & page details" />
            <form method="post" action="/api/support" className="space-y-3 p-5">
              <input type="hidden" name="kind" value="bug" />
              <input type="hidden" name="ctx_url" id="nx-ctx-url" />
              <input type="hidden" name="ctx_screen" id="nx-ctx-screen" />
              <script dangerouslySetInnerHTML={{ __html: `document.getElementById('nx-ctx-url').value=location.href;document.getElementById('nx-ctx-screen').value=screen.width+'x'+screen.height;` }} />
              <input name="subject" required placeholder="What broke?" className={field} />
              <textarea name="text" rows={4} required placeholder="What did you do, what did you expect, what happened?" className={field} />
              <button className="w-full rounded-[10px] bg-ink py-2.5 text-sm font-bold text-canvas hover:opacity-90">Report bug</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
