// Per-deployment configuration. Base domains are the one thing that differs
// between environments (prod = studionexis.com, staging = stg.studionexis.com).
// Everything host-related derives from them, so a new environment or a domain
// migration only needs env changes, no code changes.
//
// NEXT_PUBLIC_ is inlined into the client bundle at build time AND readable on the
// server/edge at runtime, so these cover middleware, server code and client
// components alike. Unset → production default.
//
// A deployment can serve MORE THAN ONE base domain at once (used during a domain
// migration, when the old and new domain are both live).
// NEXT_PUBLIC_BASE_DOMAINS is a comma-separated list; the FIRST entry is the
// canonical one used to build outbound links. NEXT_PUBLIC_BASE_DOMAIN (singular)
// is still honoured for backwards compatibility.
const RAW = process.env.NEXT_PUBLIC_BASE_DOMAINS ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "studionexis.com";

export const BASE_DOMAINS = RAW.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Canonical base domain (first in the list) — used for all generated links.
export const BASE_DOMAIN = BASE_DOMAINS[0];

// Canonical origins for this deployment.
export const APP_ORIGIN = `https://app.${BASE_DOMAIN}`;
export const APEX_ORIGIN = `https://${BASE_DOMAIN}`;

// Which of our base domains does this request host belong to? Returns the
// matching base (longest match wins if several would match), or null when the
// host is none of ours — i.e. a tenant's own custom domain.
export function baseForHost(host: string): string | null {
  const h = (host ?? "").toLowerCase();
  let best: string | null = null;
  for (const b of BASE_DOMAINS) {
    if (h === b || h.endsWith(`.${b}`)) {
      if (best === null || b.length > best.length) best = b;
    }
  }
  return best;
}

// ── Custom-domain provisioning targets ────────────────────────────────────
// What a studio must point its own domain at for us to serve it. The A-record
// IP is this server's public address; the CNAME host is a name that already
// resolves here (covered by the wildcard cert). Both are configurable per
// deployment so a server migration is an env change, not a code change.
// NEXT_PUBLIC_ so the Settings UI (client) can show the exact record to create.
export const DOMAIN_TARGET_IP =
  process.env.NEXT_PUBLIC_DOMAIN_TARGET_IP ?? "51.79.226.215";
export const DOMAIN_TARGET_HOST =
  process.env.NEXT_PUBLIC_DOMAIN_TARGET_HOST ?? `app.${BASE_DOMAIN}`;
