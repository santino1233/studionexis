"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Phone, Mail, ChevronRight, Loader2, Ticket } from "lucide-react";

// Shell global quick-search — a responsive, debounced live client search that
// drops down rich results (matching the Soul Pilates client quick-search UX:
// colored avatar, contact line, package-credit badge, "view all" footer,
// empty/loading states, keyboard + outside-click dismissal). Read-only: it hits
// GET /api/clients/search and navigates to the picked client. Enter with no
// selection falls through to the full /clients list, so nothing is lost when a
// studio just wants to search-and-browse.

type Hit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  lastVisitAt: string | null;
  credits: number;
};

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function ShellSearch() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(-1);

  // Debounced fetch. A request token guards against out-of-order responses.
  const tokenRef = useRef(0);
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myToken = ++tokenRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`, {
          headers: { accept: "application/json" },
        });
        if (myToken !== tokenRef.current) return; // superseded
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as { total: number; clients: Hit[] };
        setHits(data.clients ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (myToken === tokenRef.current) {
          setHits([]);
          setTotal(0);
        }
      } finally {
        if (myToken === tokenRef.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const gotoClient = useCallback(
    (id: string) => {
      setOpen(false);
      router.push(`/clients/${id}`);
    },
    [router],
  );
  const gotoAll = useCallback(() => {
    setOpen(false);
    router.push(`/clients?q=${encodeURIComponent(q.trim())}`);
  }, [router, q]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && hits[active]) gotoClient(hits[active].id);
      else if (q.trim().length >= 2) gotoAll();
    }
  }

  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative ml-auto hidden w-[280px] md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Find a client…"
        autoComplete="off"
        aria-label="Search clients"
        className="h-9 w-full rounded-xl border border-line-2 bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
      />

      {showDropdown && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[420px] max-w-[86vw] overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card-hover)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[12px] font-bold text-ink">Clients</span>
            <span className="text-[11.5px] text-muted">
              {loading ? "Searching…" : total > 0 ? `Showing ${hits.length} of ${total}` : ""}
            </span>
          </div>

          {loading && hits.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-7 text-center text-[13px] text-muted">
              No clients found for “{q.trim()}”
            </div>
          ) : (
            <ul>
              {hits.map((c, i) => {
                const contact = [c.phone, c.email].filter(Boolean);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => gotoClient(c.id)}
                      className={`flex w-full items-center gap-3 border-t border-line-2 px-4 py-2.5 text-left transition-colors ${
                        active === i ? "bg-raised" : "hover:bg-raised"
                      }`}
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-full text-[12.5px] font-bold text-white"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      >
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-ink">{c.name}</span>
                        <span className="flex items-center gap-1.5 truncate text-[11.5px] text-muted">
                          {c.phone && (
                            <>
                              <Phone className="size-3 shrink-0 opacity-70" /> {c.phone}
                            </>
                          )}
                          {c.phone && c.email && <span className="opacity-40">·</span>}
                          {c.email && (
                            <>
                              <Mail className="size-3 shrink-0 opacity-70" /> <span className="truncate">{c.email}</span>
                            </>
                          )}
                          {contact.length === 0 && <span>No contact details</span>}
                        </span>
                      </span>
                      {c.credits > 0 && (
                        <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-brand-wash px-2 py-1 text-[11px] font-bold text-brand sm:inline-flex">
                          <Ticket className="size-3" /> {c.credits}
                        </span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {total > hits.length && (
            <button
              type="button"
              onClick={gotoAll}
              className="flex w-full items-center justify-center gap-2 border-t border-line-2 py-3 text-[13px] font-bold text-brand hover:bg-raised"
            >
              <Search className="size-3.5" /> View all {total} results →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
