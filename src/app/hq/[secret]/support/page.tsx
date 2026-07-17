import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";

const sTone: Record<string, string> = { OPEN: "bg-blue-wash text-blue", PENDING: "bg-brand-wash text-brand", WAITING: "bg-purple-wash text-purple", RESOLVED: "bg-green-wash text-green" };
const pTone: Record<string, string> = { LOW: "bg-line-2 text-ink-2", MEDIUM: "bg-blue-wash text-blue", HIGH: "bg-brand-wash text-brand", CRITICAL: "bg-rose/10 text-rose" };

// HQ support queue (Wave 16 B3).
export default async function HqSupport({ params, searchParams }: {
  params: Promise<{ secret: string }>;
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const { secret } = await params;
  const { status, kind } = await searchParams;
  await assertHq(secret);

  const tickets = await db.supportTicket.findMany({
    where: {
      ...(status && ["OPEN", "PENDING", "WAITING", "RESOLVED"].includes(status) ? { status } : status === "unresolved" || !status ? { status: { not: "RESOLVED" } } : {}),
      ...(kind === "bug" || kind === "support" ? { kind } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: { tenant: { select: { name: true, slug: true } } },
    take: 100,
  });

  const filt = (href: string, label: string, on: boolean) => (
    <Link key={label} href={href} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? "bg-ink text-canvas" : "bg-line-2 text-ink-2 hover:text-ink"}`}>{label}</Link>
  );

  return (
    <div className="max-w-[1100px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Support</h1>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {filt("/support", "Unresolved", !status)}
        {["OPEN", "PENDING", "WAITING", "RESOLVED"].map((s) => filt(`/support?status=${s}`, s.toLowerCase(), status === s))}
        <span className="mx-1 text-muted">·</span>
        {filt("/support?kind=bug", "🐛 bugs", kind === "bug")}
        {filt("/support?kind=support", "💬 support", kind === "support")}
      </div>

      <Card className="mt-5">
        <ul className="divide-y divide-line-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-raised">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{t.kind === "bug" ? "🐛 " : ""}{t.subject}</span>
                  <span className="text-[11.5px] text-muted">{t.tenant.name} · {t.updatedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {(t.messages as unknown[]).length} msg{t.assignee ? ` · → ${t.assignee}` : ""}</span>
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pTone[t.priority]}`}>{t.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sTone[t.status]}`}>{t.status}</span>
                </span>
              </Link>
            </li>
          ))}
          {tickets.length === 0 && <li className="px-5 py-12 text-center text-sm text-muted">Queue clear. 🎉</li>}
        </ul>
      </Card>
    </div>
  );
}
