import { Card, CardHeader } from "@/components/ui/card";
import { X } from "lucide-react";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

export default async function HqKb({ params, searchParams }: { params: Promise<{ secret: string }>; searchParams: Promise<{ q?: string; edit?: string }> }) {
  const { secret } = await params;
  const { q, edit } = await searchParams;
  await assertHq(secret);
  const articles = await db.kbArticle.findMany({
    where: q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } }] } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  const editing = edit ? articles.find((a) => a.id === edit) : null;
  return (
    <div className="max-w-[1000px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Knowledge Base</h1>
      <p className="mt-1 text-sm text-muted">SOPs, troubleshooting guides and support macros for the HQ team.</p>
      <form method="get" className="mt-4"><input name="q" defaultValue={q ?? ""} placeholder="Search articles…" className="h-10 w-[300px] rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" /></form>
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Articles (${articles.length})`} />
          <ul className="divide-y divide-line-2">
            {articles.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <span className="min-w-0"><b className="block truncate text-[13.5px] text-ink">{a.title}</b><span className="text-[11.5px] text-muted">{a.tags.join(", ") || "no tags"} · {a.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
                <span className="flex shrink-0 gap-1.5">
                  <a href={`/kb?edit=${a.id}`} className="rounded-lg bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:text-ink">Edit</a>
                  <form method="post" action="/api/hq/ops"><input type="hidden" name="op" value="kb-delete" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="back" value="/kb" /><button className="rounded-lg bg-line-2 px-2 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose"><X className="size-3" /></button></form>
                </span>
              </li>
            ))}
            {articles.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nothing here{q ? " for that search" : " yet"}.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title={editing ? `Editing: ${editing.title}` : "New article"} />
          <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="op" value="kb-save" />
            <input type="hidden" name="back" value="/kb" />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <input name="title" required defaultValue={editing?.title ?? ""} placeholder="Title" className={field} />
            <input name="tags" defaultValue={editing?.tags.join(", ") ?? ""} placeholder="Tags, comma-separated" className={field} />
            <textarea name="body" rows={10} required defaultValue={editing?.body ?? ""} placeholder="Write in plain text or markdown…" className={field} />
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">{editing ? "Save changes" : "Create article"}</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
