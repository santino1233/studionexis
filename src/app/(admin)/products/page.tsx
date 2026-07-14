import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const field = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const microLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ saved?: string; archived?: string }> }) {
  const { saved, archived } = await searchParams;
  const showArchived = archived === "1";
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const [packages, products, vouchers, archivedCount] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" }, include: { _count: { select: { purchases: true } } } }),
    db.product.findMany({ where: { tenantId: tenant.id, active: !showArchived }, orderBy: { name: "asc" } }),
    db.voucher.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.product.count({ where: { tenantId: tenant.id, active: false } }),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Products &amp; Packages</h1>
      <p className="mt-1 text-sm text-muted">Everything your studio sells — class packages and retail items, all in your currency.</p>
      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Saved.</div>}

      {/* Packages */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Class credits" title="Packages" sub="Bundles of class credits clients buy up front" />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Package", "Credits", "Valid for", "Price", "Sold"].map((h) => (
                  <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[14px] text-[14px] font-semibold text-ink">
                    {p.name}
                    {p.interval !== "none" && <span className="ml-2 rounded-full bg-purple-wash px-2 py-0.5 text-[10px] font-bold uppercase text-purple">{p.interval}ly</span>}
                  </td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{p.credits}{p.interval !== "none" ? ` / ${p.interval}` : ""}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{p.interval !== "none" ? "Auto-renews" : `${p.validityDays} days`}</td>
                  <td className="px-[18px] py-[14px] text-[13px] font-semibold text-ink">{fmt.format(Number(p.price))}{p.interval === "month" ? "/mo" : p.interval === "year" ? "/yr" : ""}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-muted">{p._count.purchases}</td>
                </tr>
              ))}
              {packages.length === 0 && <tr><td colSpan={5} className="px-[18px] py-10 text-center text-sm text-muted">No packages yet.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Add package" />
          <form method="post" action="/api/packages" className="space-y-3.5 p-5">
            <input name="name" required placeholder="e.g. 10-Class Pack" className={`${field} w-full`} />
            <div className="grid grid-cols-3 gap-3">
              <div><label className={microLabel}>Credits</label><input name="credits" type="number" defaultValue={10} min={1} className={`${field} w-full`} /></div>
              <div><label className={microLabel}>Days valid</label><input name="validityDays" type="number" defaultValue={90} min={1} className={`${field} w-full`} /></div>
              <div><label className={microLabel}>Price</label><input name="price" type="number" step="0.01" min={0} defaultValue={0} className={`${field} w-full`} /></div>
            </div>
            <select name="kind" className={`${field} w-full`}>
              <option value="GROUP">For group classes</option>
              <option value="PRIVATE">For private sessions</option>
            </select>
            <div>
              <label className={microLabel}>Billing</label>
              <select name="interval" className={`${field} w-full`}>
                <option value="none">One-time pack — expires after the days above</option>
                <option value="month">Monthly membership — credits reset every month</option>
                <option value="year">Yearly membership — credits reset every year</option>
              </select>
            </div>
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add package</button>
          </form>
        </Card>
      </div>

      {/* Products */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Retail" title={showArchived ? "Archived products" : "Products"} sub={showArchived ? "Hidden from the register — restore anytime" : "Merchandise sold at the front desk — edit anything inline"} />
            {(archivedCount > 0 || showArchived) && (
              <a href={showArchived ? "/products" : "/products?archived=1"} className="rounded-lg bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:text-ink">
                {showArchived ? "← Active products" : `Archived (${archivedCount})`}
              </a>
            )}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Product", "Price", "Stock", "Restock", ""].map((h, i) => (
                  <th key={i} className="px-[14px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[14px] py-[10px]" colSpan={2}>
                    <form method="post" action={`/api/products/${p.id}`} className="flex items-center gap-2">
                      <input type="hidden" name="action" value="update" />
                      <input name="name" defaultValue={p.name} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-semibold outline-none focus:border-brand" />
                      <input name="price" type="number" step="0.01" min={0} defaultValue={Number(p.price)} className="h-9 w-[84px] rounded-lg border border-line bg-surface px-2 text-right text-[13px] outline-none focus:border-brand" />
                      <input name="stock" type="number" min={0} defaultValue={p.stock} title="Set exact stock count" className="h-9 w-[64px] rounded-lg border border-line bg-surface px-2 text-center text-[13px] outline-none focus:border-brand" />
                      <button className="rounded-lg bg-line-2 px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:text-ink">Save</button>
                    </form>
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${p.stock > 5 ? "bg-green-wash text-green" : p.stock > 0 ? "bg-brand-wash text-brand" : "bg-rose/10 text-rose"}`}>
                      {p.stock > 5 ? `${p.stock} left` : p.stock > 0 ? `Low · ${p.stock} left` : "Out of stock"}
                    </span>
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <form method="post" action={`/api/products/${p.id}`} className="flex items-center gap-1.5">
                      <input type="hidden" name="action" value="restock" />
                      <input name="qty" type="number" min={1} placeholder="+" className="h-9 w-[58px] rounded-lg border border-line bg-surface px-2 text-center text-[13px] outline-none focus:border-brand" />
                      <button className="whitespace-nowrap rounded-lg bg-green-wash px-2.5 py-1.5 text-[11px] font-bold text-green hover:brightness-95">Add</button>
                    </form>
                  </td>
                  <td className="px-[14px] py-[10px] text-right">
                    <form method="post" action={`/api/products/${p.id}`}>
                      <input type="hidden" name="action" value={showArchived ? "restore" : "archive"} />
                      <button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${showArchived ? "bg-green-wash text-green" : "bg-line-2 text-ink-2 hover:bg-rose/10 hover:text-rose"}`}>
                        {showArchived ? "Restore" : "Archive"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="px-[18px] py-10 text-center text-sm text-muted">{showArchived ? "Nothing archived." : "No products yet."}</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Add product" />
          <form method="post" action="/api/products" className="space-y-3.5 p-5">
            <input name="name" required placeholder="e.g. Grip Socks" className={`${field} w-full`} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className={microLabel}>Price</label><input name="price" type="number" step="0.01" min={0} defaultValue={0} className={`${field} w-full`} /></div>
              <div><label className={microLabel}>Stock</label><input name="stock" type="number" min={0} defaultValue={0} className={`${field} w-full`} /></div>
            </div>
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add product</button>
          </form>
        </Card>
      </div>

      {/* Vouchers */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Promotions" title="Voucher codes" sub="Discount codes staff can apply at the register" />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Code", "Discount", "Used", "Expires"].map((h) => (
                  <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[14px] font-mono text-[13.5px] font-bold tracking-wider text-ink">{v.code}</td>
                  <td className="px-[18px] py-[14px] text-[13px] font-semibold text-ink">
                    {v.type === "PERCENT" ? `${Number(v.value)}% off` : `${fmt.format(Number(v.value))} off`}
                  </td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{v.usedCount} / {v.maxUses}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-muted">
                    {v.expiresAt ? v.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && <tr><td colSpan={4} className="px-[18px] py-10 text-center text-sm text-muted">No voucher codes yet.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Create voucher" />
          <form method="post" action="/api/vouchers" className="space-y-3.5 p-5">
            <input name="code" required placeholder="e.g. WELCOME10" className={`${field} w-full uppercase`} />
            <div className="grid grid-cols-2 gap-3">
              <select name="type" className={field}>
                <option value="PERCENT">% off</option>
                <option value="FIXED">Amount off</option>
              </select>
              <input name="value" type="number" step="0.01" min="0.01" required placeholder="Value" className={`${field} w-full`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={microLabel}>Max uses</label><input name="maxUses" type="number" min={1} defaultValue={100} className={`${field} w-full`} /></div>
              <div><label className={microLabel}>Expires</label><input name="expiresAt" type="date" className={`${field} w-full`} /></div>
            </div>
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Create voucher</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
