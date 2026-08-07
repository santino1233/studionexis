// Server-only DNS verification for custom domains. NEVER import from a client
// component — it uses node:dns. It answers one question: does this domain
// actually resolve to THIS server right now? The answer drives the lifecycle
// (PENDING → VERIFYING, and the LIVE → FAILED safety re-check). It performs no
// mutation and issues no cert; the operator provisioner does that (see
// scripts/domain-provisioner.sh).
import { promises as dns } from "node:dns";
import { DOMAIN_TARGET_IP, DOMAIN_TARGET_HOST } from "@/lib/config";
import { isValidCustomDomain } from "@/lib/domain";

export type DnsCheck =
  | { pointsHere: true; via: "A" | "CNAME"; addresses: string[] }
  | { pointsHere: false; reason: string; addresses: string[] };

/**
 * Resolve `domain` and decide whether it points at this server.
 *
 * Accepts either:
 *   • an A record equal to DOMAIN_TARGET_IP, or
 *   • a CNAME to DOMAIN_TARGET_HOST (or any name that itself resolves to our IP
 *     — resolve4 follows the CNAME chain, so this is covered by the A check).
 *
 * A domain that resolves to some OTHER address is treated as "points
 * elsewhere" — we must never provision a cert for a name we don't control.
 */
export async function checkDomainDns(domain: string): Promise<DnsCheck> {
  if (!isValidCustomDomain(domain)) {
    return { pointsHere: false, reason: "invalid domain", addresses: [] };
  }

  // CNAME to our canonical host is an explicit, unambiguous "yes".
  try {
    const cnames = await dns.resolveCname(domain);
    if (cnames.some((c) => c.replace(/\.$/, "").toLowerCase() === DOMAIN_TARGET_HOST)) {
      return { pointsHere: true, via: "CNAME", addresses: cnames };
    }
  } catch {
    /* no CNAME — fall through to A-record check */
  }

  let addresses: string[] = [];
  try {
    // resolve4 follows any CNAME chain and returns the final A records, so this
    // also covers "CNAME to a host that resolves to our IP".
    addresses = await dns.resolve4(domain);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? "";
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return { pointsHere: false, reason: "no DNS record yet", addresses: [] };
    }
    return { pointsHere: false, reason: "DNS lookup failed", addresses: [] };
  }

  if (addresses.includes(DOMAIN_TARGET_IP)) {
    return { pointsHere: true, via: "A", addresses };
  }
  return {
    pointsHere: false,
    reason: `points to ${addresses.join(", ") || "nowhere"} (expected ${DOMAIN_TARGET_IP})`,
    addresses,
  };
}
