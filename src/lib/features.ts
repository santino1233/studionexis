import type { Tenant } from "@prisma/client";

// Custom paid features (Wave 12 Z8): HQ grants tenant-specific feature
// flags with a monthly price; code paths gate on hasFeature(). Requests
// from studios queue in policies.featureRequests for HQ review.

export type CustomFeature = { id: string; label: string; price: number; active: boolean };
export type FeatureRequest = { text: string; at: string; status: "NEW" | "REVIEWING" | "DONE" | "DECLINED" };

type Pol = { customFeatures?: CustomFeature[]; featureRequests?: FeatureRequest[] };

export function customFeatures(tenant: Pick<Tenant, "policies">): CustomFeature[] {
  const v = ((tenant.policies ?? {}) as Pol).customFeatures;
  return Array.isArray(v) ? v : [];
}

export function hasFeature(tenant: Pick<Tenant, "policies">, id: string): boolean {
  return customFeatures(tenant).some((f) => f.id === id && f.active);
}

export function featureRequests(tenant: Pick<Tenant, "policies">): FeatureRequest[] {
  const v = ((tenant.policies ?? {}) as Pol).featureRequests;
  return Array.isArray(v) ? v : [];
}

export function slugifyFeature(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "feature";
}
