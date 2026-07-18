"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AppLogo } from "@/components/apps/app-logos";

type BrowseApp = { id: string; name: string; category: string; blurb: string; kind: "config" | "status" };

// Pipedrive-style "Browse the marketplace" popup: search the catalog, add apps,
// or request one we don't have yet.
export function StoreBrowser({ browse }: { browse: BrowseApp[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [requesting, setRequesting] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? browse.filter((a) => `${a.name} ${a.category} ${a.blurb}`.toLowerCase().includes(s)) : browse;
  }, [q, browse]);

  // Group results by category, preserving catalog order — Pipedrive-style.
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, BrowseApp[]>();
    for (const a of results) {
      if (!map.has(a.category)) { map.set(a.category, []); order.push(a.category); }
      map.get(a.category)!.push(a);
    }
    return order.map((c) => [c, map.get(c)!] as const);
  }, [results]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">
        ＋ Browse the marketplace
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px] sm:p-8" onClick={() => setOpen(false)}>
          <div className="mt-4 w-full max-w-[720px] overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-2xl sm:mt-8" onClick={(e) => e.stopPropagation()}>
            {/* Header + search */}
            <div className="border-b border-line-2 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[18px] font-extrabold text-ink">App marketplace</h2>
                <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"><X className="size-[18px]" /></button>
              </div>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Search className="size-4" /></span>
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps — Slack, Stripe, calendar…"
                  className="h-11 w-full rounded-xl border border-line-2 bg-canvas pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[52vh] overflow-y-auto p-3">
              {groups.map(([category, apps]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted">{category}</div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {apps.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line-2 bg-canvas p-3">
                        <span className="size-10 shrink-0 overflow-hidden rounded-lg"><AppLogo id={a.id} className="block size-10" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-ink">{a.name}</div>
                          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-2">{a.blurb}</p>
                          {a.kind === "config" ? (
                            <form method="post" action="/api/settings" className="mt-2">
                              <input type="hidden" name="section" value="app-install" />
                              <input type="hidden" name="appId" value={a.id} />
                              <input type="hidden" name="next" value="/apps?saved=1" />
                              <button className="rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-brand-ink">＋ Add</button>
                            </form>
                          ) : (
                            <a href={a.id === "stripe" ? "/settings?tab=money" : "/billing"} className="mt-2 inline-block rounded-lg border border-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:text-ink">Set up →</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] text-muted">No apps match &ldquo;{q}&rdquo;. Request it below and we&apos;ll look into adding it.</div>
              )}
            </div>

            {/* Request an app */}
            <div className="border-t border-line-2 bg-raised/50 p-4">
              {requesting ? (
                <form method="post" action="/api/apps/request" className="flex flex-col gap-2 sm:flex-row">
                  <input name="name" required autoFocus defaultValue={q} placeholder="Which app would you like? (e.g. Mailchimp, QuickBooks)"
                    className="h-10 flex-1 rounded-lg border border-line-2 bg-surface px-3 text-sm outline-none focus:border-brand" />
                  <button className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-bold text-canvas hover:opacity-90">Send request</button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12.5px] text-ink-2"><b className="text-ink">Don&apos;t see what you need?</b> Tell us which app to add next.</div>
                  <button onClick={() => setRequesting(true)} className="shrink-0 rounded-lg border border-line-2 px-4 py-2 text-[12.5px] font-bold text-ink-2 hover:text-ink">Request an app</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
