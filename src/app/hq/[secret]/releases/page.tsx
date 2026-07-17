import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

export default async function HqReleases({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const releases = await db.release.findMany({ orderBy: { publishedAt: "desc" }, take: 30 });
  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Releases</h1>
      <p className="mt-1 text-sm text-muted">Published notes appear on every studio&apos;s &ldquo;What&apos;s new&rdquo; page.</p>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Publish release" />
          <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="op" value="release" />
            <input type="hidden" name="back" value="/releases" />
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <input name="version" required placeholder="v2.4" className={field} />
              <input name="title" required placeholder="Title" className={field} />
            </div>
            <textarea name="notes" rows={6} required placeholder={"What changed — one item per line"} className={field} />
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">Publish</button>
          </form>
        </Card>
        <Card>
          <CardHeader title="History" />
          <ul className="divide-y divide-line-2">
            {releases.map((r) => (
              <li key={r.id} className="px-5 py-3">
                <b className="text-[13.5px] text-ink">{r.version} — {r.title}</b>
                <span className="block text-[11.5px] text-muted">{r.publishedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </li>
            ))}
            {releases.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nothing published yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
