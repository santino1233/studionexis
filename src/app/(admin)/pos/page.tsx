import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { PosClient } from "@/components/pos/pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const tenant = await getCurrentTenant();
  const [packages, products, clients] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" } }),
    db.product.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }),
  ]);

  const sellables = [
    ...packages.map((p) => ({
      id: p.id, kind: "package" as const, name: p.name, price: Number(p.price),
      meta: `${p.credits} credits · ${p.validityDays} days`,
    })),
    ...products.map((p) => ({
      id: p.id, kind: "product" as const, name: p.name, price: Number(p.price),
      meta: p.stock > 0 ? `${p.stock} in stock` : "Out of stock", stock: p.stock,
    })),
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Point of Sale</h1>
      <p className="mt-1 text-sm text-muted">Sell packages and products — package credits land on the client instantly.</p>
      <div className="mt-6">
        <PosClient sellables={sellables} clients={clients} currency={tenant.currency} />
      </div>
    </div>
  );
}
