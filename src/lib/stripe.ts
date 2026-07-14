import Stripe from "stripe";
import type { Tenant } from "@prisma/client";

// ── Stripe framework (Wave 12 Z6) ─────────────────────────────────────
// Two independent levels, both dormant until keys exist:
//  · Platform (SaaS): STRIPE_SECRET_KEY env — StudioNexis charging studios
//    for their subscription plans.
//  · Studio: each studio pastes its own secret key (Settings → Money,
//    stored in policies.stripe) — the studio charging ITS clients for
//    packages and memberships through Stripe Checkout.

export type StudioStripeConfig = { secretKey?: string; connectedAt?: string; accountLabel?: string };

export function platformStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function studioStripeConfig(tenant: Pick<Tenant, "policies">): StudioStripeConfig {
  return (((tenant.policies ?? {}) as Record<string, unknown>).stripe ?? {}) as StudioStripeConfig;
}

export function studioStripe(tenant: Pick<Tenant, "policies">): Stripe | null {
  const key = studioStripeConfig(tenant).secretKey;
  return key ? new Stripe(key) : null;
}

export function studioStripeEnabled(tenant: Pick<Tenant, "policies">): boolean {
  return !!studioStripeConfig(tenant).secretKey;
}

// Validate a pasted key by hitting the API; returns the account label.
export async function verifyStripeKey(secretKey: string): Promise<{ ok: true; label: string } | { ok: false }> {
  try {
    const s = new Stripe(secretKey);
    const bal = await s.balance.retrieve();
    return { ok: true, label: `account in ${(bal.available[0]?.currency ?? "usd").toUpperCase()}` };
  } catch {
    return { ok: false };
  }
}

// Zero-decimal currencies charge whole units in Stripe.
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);
export function toStripeAmount(amount: number, currency: string): number {
  return Math.round(ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount * 100);
}
