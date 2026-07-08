"use client";

import { useMemo, useState } from "react";
import { Package, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";

type Sellable = { id: string; kind: "package" | "product"; name: string; price: number; meta: string; stock?: number };
type ClientOpt = { id: string; name: string };

export function PosClient({ sellables, clients, currency }: { sellables: Sellable[]; clients: ClientOpt[]; currency: string }) {
  const fmt = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }), [currency]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [clientId, setClientId] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(sellables.map((s) => [s.id, s])), [sellables]);
  const lines = [...cart.entries()].map(([id, qty]) => ({ item: byId.get(id)!, qty }));
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const needsClient = lines.some((l) => l.item.kind === "package");

  const add = (id: string) => { setDone(null); setError(null); setCart((c) => new Map(c).set(id, (c.get(id) ?? 0) + 1)); };
  const remove = (id: string) => setCart((c) => { const n = new Map(c); n.delete(id); return n; });

  async function checkout() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId || undefined, method, items: lines.map((l) => ({ kind: l.item.kind, refId: l.item.id, qty: l.qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      setDone(data.number); setCart(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Catalog */}
      <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3 lg:col-span-2">
        {sellables.map((s) => (
          <button
            key={s.id}
            onClick={() => add(s.id)}
            disabled={s.kind === "product" && (s.stock ?? 0) <= (cart.get(s.id) ?? 0)}
            className="rounded-2xl border border-line-2 bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] disabled:opacity-40"
          >
            <div className={`mb-3 grid size-10 place-items-center rounded-xl ${s.kind === "package" ? "bg-brand-wash text-brand" : "bg-blue-wash text-blue"}`}>
              {s.kind === "package" ? <Package className="size-5" /> : <ShoppingBag className="size-5" />}
            </div>
            <div className="text-[13.5px] font-bold leading-tight text-ink">{s.name}</div>
            <div className="mt-0.5 text-[11.5px] text-muted">{s.meta}</div>
            <div className="mt-2 font-display text-[15px] font-extrabold text-ink">{fmt.format(s.price)}</div>
          </button>
        ))}
        {sellables.length === 0 && (
          <div className="col-span-full rounded-2xl border border-line-2 bg-surface p-10 text-center text-sm text-muted">
            Nothing to sell yet — add packages or products first.
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
        <div className="border-b border-line-2 px-5 py-4 font-display text-[16.5px] font-extrabold text-ink">Cart</div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-2">Client {needsClient && <span className="text-brand">*</span>}</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand">
              <option value="">Walk-in / no client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {needsClient && !clientId && <p className="mt-1 text-[11.5px] text-brand">Packages must go to a client.</p>}
          </div>

          {lines.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">Tap items to add them.</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.item.id} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">{l.item.name}</div>
                    <div className="text-[11.5px] text-muted">×{l.qty} · {fmt.format(l.item.price * l.qty)}</div>
                  </div>
                  <button onClick={() => remove(l.item.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-rose/10 hover:text-rose"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-2">Payment</label>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "transfer", "card"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`rounded-[10px] border px-2 py-2 text-[12.5px] font-bold capitalize transition-colors ${method === m ? "border-brand bg-brand-wash text-brand" : "border-line bg-surface text-ink-2 hover:bg-raised"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line-2 pt-4">
            <span className="text-[13px] font-semibold text-ink-2">Total</span>
            <span className="font-display text-[22px] font-extrabold text-ink">{fmt.format(total)}</span>
          </div>

          {error && <div className="rounded-xl border border-rose/20 bg-rose/5 px-3 py-2 text-[12.5px] font-medium text-rose">{error}</div>}
          {done !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-green/20 bg-green-wash px-3 py-2.5 text-[13px] font-bold text-green">
              <CheckCircle2 className="size-4" /> Paid — order #{done}
            </div>
          )}

          <button
            onClick={checkout}
            disabled={busy || lines.length === 0 || (needsClient && !clientId)}
            className="w-full rounded-[10px] bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-ink disabled:opacity-40"
          >
            {busy ? "Charging…" : `Charge ${fmt.format(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
