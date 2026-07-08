import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Tenant comes from the signed session (set at login). Host-based
// resolution for tenant subdomains/custom domains arrives at cutover.
export async function getCurrentTenant() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) redirect("/login");
  return tenant;
}

export function moneyFormatter(currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });
}
