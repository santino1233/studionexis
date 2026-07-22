// Canonical public URL for a studio's booking/website. Every "view your site"
// link in the app must go through here so we never leak the internal
// /s/<slug> form. Custom domain wins when configured; otherwise the studio's
// subdomain <slug>.nexis.revsports.ca. Pure (no db) so it's safe in client
// components too.
import { BASE_DOMAIN } from "@/lib/config";

const BASE = BASE_DOMAIN;

export function publicSiteUrl(tenant: { slug: string; customDomain?: string | null }, path = ""): string {
  const origin = tenant.customDomain ? `https://${tenant.customDomain}` : `https://${tenant.slug}.${BASE}`;
  if (!path) return origin;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
