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

// Canonical cross-tenant client identity: match the same person across an
// account's locations by phone or email. Returns a Prisma OR clause (empty ⇒
// no identifiers, so callers should treat it as "no match"). Single source of
// truth for cross-location lookups (credit visibility today; Phase 3 later).
export function linkedClientOr(client: { phone?: string | null; email?: string | null }): Array<{ phone: string } | { email: string }> {
  const or: Array<{ phone: string } | { email: string }> = [];
  if (client.phone?.trim()) or.push({ phone: client.phone.trim() });
  if (client.email?.trim()) or.push({ email: client.email.trim() });
  return or;
}
