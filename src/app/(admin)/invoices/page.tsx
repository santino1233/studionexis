import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  PAID: "bg-green-wash text-green",
  PENDING: "bg-brand-wash text-brand",
  REFUNDED: "bg-purple-wash text-purple",
  VOID: "bg-line-2 text-muted",
};

export default async function InvoicesPage() {
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const orders = await db.order.findMany({
    where: { tenantId: tenant.id },
    include: { client: true, items: true },
    orderBy: { number: "desc" },
    take: 100,
  });
  const paidTotal = orders.filter((o) => o.status === "PAID").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Invoices</h1>
          <p className="mt-1 text-sm text-muted">Every sale rung up at your studio.</p>
        </div>
        <div className="rounded-2xl border border-line-2 bg-surface px-5 py-3 text-right shadow-[var(--shadow-card)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Collected (shown)</div>
          <div className="font-display text-[20px] font-extrabold text-ink">{fmt.format(paidTotal)}</div>
        </div>
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["#", "Client", "Items", "Method", "Total", "Status", "Date"].map((h) => (
                <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[18px] py-[14px] font-display text-[14px] font-extrabold text-ink">#{o.number}</td>
                <td className="px-[18px] py-[14px] text-[13.5px]">
                  {o.client ? (
                    <Link href={`/clients/${o.client.id}`} className="font-semibold text-ink hover:text-brand">{o.client.name}</Link>
                  ) : (
                    <span className="text-muted">Walk-in</span>
                  )}
                </td>
                <td className="max-w-[260px] px-[18px] py-[14px] text-[13px] text-ink-2">
                  <span className="line-clamp-1">{o.items.map((i) => `${i.label}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</span>
                </td>
                <td className="px-[18px] py-[14px] text-[13px] capitalize text-ink-2">{o.method}</td>
                <td className="px-[18px] py-[14px] text-[13.5px] font-bold text-ink">{fmt.format(Number(o.total))}</td>
                <td className="px-[18px] py-[14px]">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[o.status] ?? "bg-line-2 text-ink-2"}`}>{o.status.toLowerCase()}</span>
                </td>
                <td className="px-[18px] py-[14px] text-[13px] text-muted">
                  {o.createdAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-[18px] py-12 text-center text-sm text-muted">No sales yet — ring one up in the POS.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
