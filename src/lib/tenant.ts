import { db } from "@/lib/db";

// V3 will resolve the tenant from the request Host (subdomain / custom
// domain). Until auth+middleware land, the dev tenant stands in.
export async function getCurrentTenant() {
  const tenant = await db.tenant.findUnique({ where: { slug: "dev-studio" } });
  if (!tenant) throw new Error("Dev tenant missing — run: npx tsx prisma/seed.ts");
  return tenant;
}

export function moneyFormatter(currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });
}
