// Canonical public URL for a studio's booking/website. Every "view your site"
// link in the app must go through here so we never leak the internal
// /s/<slug> form. Custom domain wins ONLY once it is verified & live; otherwise
// the studio's subdomain <slug>.<base domain>. Pure (no db) so it's safe in
// client components too.
//
// Domain lifecycle: setting a custom domain stores it on the tenant and marks
// policies.domain.status = "PENDING_DNS". It must only take over the public URL
// once verification promotes it to "LIVE" — otherwise an unverified (or
// mis-pointed / cert-less) domain would hijack every booking link and break
// them. So we gate on that status here.
import { BASE_DOMAIN } from "@/lib/config";
import { isDomainLive } from "@/lib/domain";

const BASE = BASE_DOMAIN;

export function publicSiteUrl(
  tenant: { slug: string; customDomain?: string | null; policies?: unknown },
  path = "",
): string {
  const domainLive = isDomainLive(tenant.policies);
  const origin =
    tenant.customDomain && domainLive
      ? `https://${tenant.customDomain}`
      : `https://${tenant.slug}.${BASE}`;
  if (!path) return origin;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
