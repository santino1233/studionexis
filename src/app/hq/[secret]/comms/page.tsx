import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const tone: Record<string, string> = { sent: "bg-green-wash text-green", SENT: "bg-green-wash text-green", DELIVERED: "bg-green-wash text-green", skipped: "bg-line-2 text-muted", failed: "bg-rose/10 text-rose", FAILED: "bg-rose/10 text-rose" };

export default async function HqComms({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const [emails, sms] = await Promise.all([
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    db.smsMessage.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  return (
    <div className="max-w-[1200px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Email &amp; SMS</h1>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Email (${emails.length} recent)`} sub="Delivery is simulated until SMTP is configured" />
          <ul className="divide-y divide-line-2">
            {emails.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-[12.5px]">
                <span className="min-w-0"><b className="block truncate text-ink">{e.subject}</b><span className="text-muted">{e.to} · {e.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone[e.status] ?? "bg-line-2 text-ink-2"}`}>{e.status}</span>
                  <form method="post" action="/api/hq/ops"><input type="hidden" name="op" value="email-resend" /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value="/comms" /><button className="rounded-md bg-line-2 px-2 py-0.5 text-[10.5px] font-bold text-ink-2 hover:text-ink">Resend</button></form>
                </span>
              </li>
            ))}
            {emails.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No emails yet.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title={`SMS (${sms.length} recent)`} sub="Includes estimated vs reconciled charges" />
          <ul className="divide-y divide-line-2">
            {sms.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-[12.5px]">
                <span className="min-w-0"><b className="block truncate text-ink">{m.to}</b><span className="truncate text-muted">{m.body.slice(0, 60)}…</span></span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone[m.status] ?? "bg-line-2 text-ink-2"}`}>{m.status}</span>
              </li>
            ))}
            {sms.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No SMS yet — Twilio credentials pending.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
