// Custom-domain verification lifecycle — single source of truth.
//
// A studio can point its own domain (e.g. www.theirstudio.com) at Studio Nexis.
// The domain only takes over the studio's public URL once it is fully
// provisioned (DNS pointed here + TLS cert issued + nginx serving it). Until
// then every booking/website link keeps using the safe <slug>.<base> subdomain
// (see lib/site-url.ts). This module owns the state machine both the app (UI,
// verify route, cron) and the operator provisioner script agree on.
//
// Pure + dependency-free so it is safe to import from client components, server
// actions, route handlers and the worker alike.

/**
 * Lifecycle states, in order:
 *   PENDING    — domain saved; DNS not (yet) pointing at this server.
 *   VERIFYING  — DNS confirmed pointing here; awaiting cert + nginx provisioning.
 *   LIVE       — cert issued, nginx serving it, smoke test passed. Public URL
 *                switches to the custom domain (the ONLY status site-url trusts).
 *   FAILED     — DNS points elsewhere, cert/nginx failed, or a previously-LIVE
 *                domain stopped resolving here. We fall back to the subdomain.
 */
export type DomainStatus = "PENDING" | "VERIFYING" | "LIVE" | "FAILED";

export type DomainPolicy = {
  status: DomainStatus;
  /** Short human-readable reason when status is FAILED. */
  error?: string | null;
  /** ISO timestamp of the last DNS/provisioning check. */
  checkedAt?: string | null;
};

/** Shape of the `policies` JSON blob we care about here. */
type PoliciesWithDomain = { domain?: unknown } | null | undefined;

/**
 * Legacy statuses predate this module. Map them onto the canonical machine so
 * old rows (and the provisioner, mid-migration) keep rendering correctly:
 *   PENDING_DNS -> PENDING,  ERROR -> FAILED.
 */
export function normalizeDomainStatus(raw: unknown): DomainStatus | null {
  switch (String(raw ?? "")) {
    case "PENDING":
    case "PENDING_DNS":
      return "PENDING";
    case "VERIFYING":
      return "VERIFYING";
    case "LIVE":
      return "LIVE";
    case "FAILED":
    case "ERROR":
      return "FAILED";
    default:
      return null;
  }
}

/** Read + normalize the domain policy off a tenant's `policies` JSON. */
export function domainPolicyOf(policies: unknown): DomainPolicy | null {
  const raw = (policies as PoliciesWithDomain)?.domain as
    | Record<string, unknown>
    | undefined;
  if (!raw) return null;
  const status = normalizeDomainStatus(raw.status);
  if (!status) return null;
  return {
    status,
    error: (raw.error as string | null | undefined) ?? null,
    checkedAt: (raw.checkedAt as string | null | undefined) ?? null,
  };
}

/** True only when the custom domain is fully live and safe to link to. */
export function isDomainLive(policies: unknown): boolean {
  return domainPolicyOf(policies)?.status === "LIVE";
}

/**
 * Normalize a domain string entered by a studio: lower-case, strip scheme,
 * path, port, whitespace and a trailing dot. Returns "" for empty input.
 */
export function normalizeDomain(input: string): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:.*$/, "")
    .replace(/\.$/, "");
}

/**
 * A registrable custom domain: at least two labels, letters/digits/hyphens,
 * no leading hyphen. Deliberately shell-inert (matches the provisioner's own
 * allowlist) so a domain string can never carry shell metacharacters into the
 * operator scripts that interpolate it into certbot/nginx commands.
 */
const DOMAIN_RE = /^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

export function isValidCustomDomain(domain: string): boolean {
  return (
    DOMAIN_RE.test(domain) &&
    domain.length <= 253 &&
    !domain.includes("..") &&
    domain.split(".").every((l) => l.length >= 1 && l.length <= 63)
  );
}

/** Build the domain policy object to persist for a given status. */
export function makeDomainPolicy(
  status: DomainStatus,
  error?: string | null,
): DomainPolicy {
  return { status, error: error ?? null, checkedAt: new Date().toISOString() };
}
