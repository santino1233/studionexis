import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz } from "@/lib/tz";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = ["Rent", "Salaries", "Utilities", "Equipment", "Marketing", "Supplies", "Software", "Other"];
const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const microLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ m?: string; error?: string }> }) {
  const { m: ym, error } = await searchParams;
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const custom = ((tenant.policies ?? {}) as { expenseCategories?: string[] }).expenseCategories;
  const CATEGORIES = custom && custom.length > 0 ? custom : DEFAULT_CATEGORIES;

  const nowKey = dayKeyInTz(new Date(), tenant.timezone);
  const key = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : nowKey.slice(0, 7);
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - 14 * 3600_000);
  const end = new Date(Date.UTC(y, m, 1) + 14 * 3600_000);
  const inMonth = (d: Date) => dayKeyInTz(d, tenant.timezone).startsWith(key);

  const [expensesRaw, ordersRaw] = await Promise.all([
    db.expense.findMany({ where: { tenantId: tenant.id, date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    db.order.findMany({ where: { tenantId: tenant.id, status: "PAID", createdAt: { gte: start, lt: end } }, select: { total: true, createdAt: true } }),
  ]);
  const expenses = expensesRaw.filter((e) => inMonth(e.date));
  const revenue = ordersRaw.filter((o) => inMonth(o.createdAt)).reduce((s, o) => s + Number(o.total), 0);
  const spend = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - spend;

  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] ?? 1;

  const monthLabel = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Expenses &amp; P&amp;L</h1>
          <p className="mt-1 text-sm text-muted">What you spent, what you made, what&apos;s left.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/expenses?m=${prev}`} className="rounded-xl border border-line-2 bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:bg-raised">←</a>
          <span className="rounded-xl border border-line-2 bg-surface px-4 py-2 text-sm font-bold text-ink">{monthLabel}</span>
          <a href={`/expenses?m=${next}`} className="rounded-xl border border-line-2 bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:bg-raised">→</a>
        </div>
      </div>

      {error === "amount" && <div className="mb-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">The amount needs to be more than zero.</div>}

      {/* P&L strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {([
          ["Revenue", fmt.format(revenue), "text-ink", ""],
          ["Expenses", fmt.format(spend), "text-ink", ""],
          ["Profit", fmt.format(profit), profit >= 0 ? "text-green" : "text-rose", revenue > 0 ? `${Math.round((profit / revenue) * 100)}% margin` : ""],
        ] as const).map(([l, v, tone, sub]) => (
          <div key={l} className="rounded-2xl border border-line-2 bg-surface px-[18px] py-4 shadow-[var(--shadow-card)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{l} — {monthLabel.split(" ")[0]}</div>
            <div className={`mt-1 font-display text-[24px] font-extrabold ${tone}`}>{v}</div>
            {sub && <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Expenses" sub={`${expenses.length} this month`} />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Date", "Category", "Note", "Amount", ""].map((h, i) => (
                  <th key={i} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[13px] text-[13px] text-ink-2">{e.date.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric" })}</td>
                  <td className="px-[18px] py-[13px]"><span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold text-ink-2">{e.category}</span></td>
                  <td className="max-w-[200px] px-[18px] py-[13px] text-[13px] text-muted"><span className="line-clamp-1">{e.note ?? "—"}</span></td>
                  <td className="px-[18px] py-[13px] text-[13.5px] font-bold text-ink">{fmt.format(Number(e.amount))}</td>
                  <td className="px-[18px] py-[13px]">
                    <form method="post" action={`/api/expenses/${e.id}`} className="flex justify-end">
                      <input type="hidden" name="action" value="delete" />
                      <button className="grid size-7 place-items-center rounded-lg text-muted hover:bg-rose/10 hover:text-rose" aria-label="Delete"><Trash2 className="size-3.5" /></button>
                    </form>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} className="px-[18px] py-10 text-center text-sm text-muted">No expenses recorded this month.</td></tr>}
            </tbody>
          </table>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Add expense" />
            <form method="post" action="/api/expenses" className="space-y-3.5 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={microLabel}>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required className={field} /></div>
                <div><label className={microLabel}>Date</label><input name="date" type="date" defaultValue={nowKey} className={field} /></div>
              </div>
              <select name="category" className={field}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              <input name="note" placeholder="Note (optional)" className={field} />
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add expense</button>
            </form>
          </Card>

          <Card>
            <CardHeader title="By category" />
            <div className="space-y-3 p-5">
              {cats.length === 0 && <p className="text-[13px] text-muted">Nothing yet.</p>}
              {cats.map(([c, v]) => (
                <div key={c}>
                  <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-semibold text-ink-2">{c}</span><span className="font-bold text-ink">{fmt.format(v)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-brand" style={{ width: `${(v / maxCat) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
