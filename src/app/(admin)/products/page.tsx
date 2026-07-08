import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const field = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const microLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

export default async function ProductsPage() {
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const [packages, products] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" }, include: { _count: { select: { purchases: true } } } }),
    db.product.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Products &amp; Packages</h1>
      <p className="mt-1 text-sm text-muted">Everything your studio sells — class packages and retail items, all in your currency.</p>

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
                  <td className="px-[18px] py-[14px] text-[14px] font-semibold text-ink">{p.name}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{p.credits}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{p.validityDays} days</td>
                  <td className="px-[18px] py-[14px] text-[13px] font-semibold text-ink">{fmt.format(Number(p.price))}</td>
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
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add package</button>
          </form>
        </Card>
      </div>

      {/* Products */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Retail" title="Products" sub="Merchandise sold at the front desk" />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Product", "Price", "In stock"].map((h) => (
                  <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[14px] text-[14px] font-semibold text-ink">{p.name}</td>
                  <td className="px-[18px] py-[14px] text-[13px] font-semibold text-ink">{fmt.format(Number(p.price))}</td>
                  <td className="px-[18px] py-[14px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.stock > 5 ? "bg-green-wash text-green" : p.stock > 0 ? "bg-brand-wash text-brand" : "bg-rose/10 text-rose"}`}>
                      {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                    </span>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={3} className="px-[18px] py-10 text-center text-sm text-muted">No products yet.</td></tr>}
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
    </div>
  );
}
