import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WhatsNewPage() {
  const releases = await db.release.findMany({ orderBy: { publishedAt: "desc" }, take: 20 });
  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">What&apos;s new</h1>
      <p className="mt-1 text-sm text-muted">Everything we&apos;ve shipped recently.</p>
      <div className="mt-6 space-y-5">
        {releases.map((r) => (
          <Card key={r.id} className="p-6">
            <div className="flex items-baseline gap-2.5">
              <span className="rounded-full bg-brand-wash px-2.5 py-1 font-mono text-[11px] font-bold text-brand">{r.version}</span>
              <h2 className="font-display text-[19px] font-extrabold text-ink">{r.title}</h2>
              <span className="ml-auto text-[11.5px] text-muted">{r.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="mt-3 space-y-1 text-[13.5px] leading-relaxed text-ink-2">
              {r.notes.split("\n").filter(Boolean).map((line, i) => <p key={i}>{line.startsWith("-") ? "•" + line.slice(1) : line}</p>)}
            </div>
          </Card>
        ))}
        {releases.length === 0 && <Card className="p-10 text-center text-sm text-muted">No release notes yet — check back soon.</Card>}
      </div>
    </div>
  );
}
