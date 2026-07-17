import { db } from "@/lib/db";
import { mrrOf } from "@/lib/hq";

// Franchise / multi-location helpers. Sync flags live on Organization.policies
// so they apply account-wide; all default off (fully isolated).
export type SyncFlags = { clients?: boolean; classTypes?: boolean; sharedCredits?: boolean; memberships?: boolean };

export function orgSync(orgPolicies: unknown): SyncFlags {
  return (((orgPolicies ?? {}) as { sync?: SyncFlags }).sync) ?? {};
}

export async function orgTenants(organizationId: string | null | undefined) {
  if (!organizationId) return [];
  return db.tenant.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });
}

// Combined monthly subscription value across every location in the account.
export function combinedMrr(tenants: Parameters<typeof mrrOf>[0][]): number {
  return tenants.reduce((n, t) => n + mrrOf(t), 0);
}
