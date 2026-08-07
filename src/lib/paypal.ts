import type { Tenant } from "@prisma/client";

// ── PayPal framework (per-tenant, alternative to Stripe) ───────────────
// Each studio pastes its OWN PayPal REST app credentials (Settings → Money,
// stored in policies.paypal) — the studio charging ITS clients for packages
// and gift cards through PayPal Orders v2. Fully dormant until a studio saves
// a clientId + secret and flips `enabled` on; if unconfigured it stays dark and
// no PayPal button ever renders. No credentials are ever invented.
//
// Mirrors lib/stripe.ts (studioStripe / studioStripeConfig / studioStripeEnabled).

export type PayPalMode = "sandbox" | "live";

export type StudioPayPalConfig = {
  clientId?: string;
  secret?: string;
  mode?: PayPalMode;
  enabled?: boolean;
  /** Optional: the studio's registered webhook id, used to verify webhook signatures. */
  webhookId?: string;
  connectedAt?: string;
  accountLabel?: string;
};

export function studioPayPalConfig(tenant: Pick<Tenant, "policies">): StudioPayPalConfig {
  return (((tenant.policies ?? {}) as Record<string, unknown>).paypal ?? {}) as StudioPayPalConfig;
}

/** True only when a studio has saved creds AND explicitly enabled PayPal. */
export function studioPayPalEnabled(tenant: Pick<Tenant, "policies">): boolean {
  const c = studioPayPalConfig(tenant);
  return !!(c.enabled && c.clientId && c.secret);
}

/** The public client-id + mode the browser SDK needs (never the secret). */
export function studioPayPalPublic(
  tenant: Pick<Tenant, "policies">
): { clientId: string; mode: PayPalMode } | null {
  const c = studioPayPalConfig(tenant);
  if (!studioPayPalEnabled(tenant)) return null;
  return { clientId: c.clientId!, mode: c.mode === "live" ? "live" : "sandbox" };
}

export function paypalApiBase(mode: PayPalMode | undefined): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

// PayPal wants zero-decimal currencies as whole-number strings and everything
// else with exactly two decimals.
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "HUF", "TWD"]);
export function toPayPalAmount(amount: number, currency: string): string {
  return ZERO_DECIMAL.has(currency.toUpperCase())
    ? String(Math.round(amount))
    : amount.toFixed(2);
}

type Creds = Pick<StudioPayPalConfig, "clientId" | "secret" | "mode">;

/** OAuth2 client-credentials access token for a studio's PayPal app. */
async function accessToken(cfg: Creds): Promise<string> {
  if (!cfg.clientId || !cfg.secret) throw new Error("PayPal is not configured");
  const base = paypalApiBase(cfg.mode);
  const basic = Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("PayPal auth: no token");
  return json.access_token;
}

export type PayPalOrderResult = { id: string; status: string };

/** Create an Orders-v2 order for a single purchase unit; server-computed amount. */
export async function createPayPalOrder(
  cfg: Creds,
  args: {
    currency: string;
    amount: number;
    description: string;
    referenceId: string; // "package" | "giftcard"
    customId?: string; // our intent id, echoed back on webhooks
  }
): Promise<PayPalOrderResult> {
  const base = paypalApiBase(cfg.mode);
  const token = await accessToken(cfg);
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.referenceId,
          custom_id: args.customId,
          description: args.description.slice(0, 127),
          amount: {
            currency_code: args.currency.toUpperCase(),
            value: toPayPalAmount(args.amount, args.currency),
          },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal create order failed (${res.status})`);
  const json = (await res.json()) as PayPalOrderResult;
  if (!json.id) throw new Error("PayPal create order: no id");
  return json;
}

export type PayPalCapture = {
  status: string; // COMPLETED when paid
  currency: string;
  amount: number;
  captureId: string | null;
  raw: unknown;
};

/** Capture a previously created order and normalise the money we actually got. */
export async function capturePayPalOrder(cfg: Creds, orderId: string): Promise<PayPalCapture> {
  const base = paypalApiBase(cfg.mode);
  const token = await accessToken(cfg);
  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // A duplicate capture (order already captured) is not fatal — the reconcile
    // path below re-reads the order. Anything else is a hard failure.
    throw new Error(`PayPal capture failed (${res.status})`);
  }
  return normaliseCapture(json);
}

/** Read an order back (used to reconcile a webhook without re-capturing). */
export async function getPayPalOrder(cfg: Creds, orderId: string): Promise<PayPalCapture> {
  const base = paypalApiBase(cfg.mode);
  const token = await accessToken(cfg);
  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`PayPal get order failed (${res.status})`);
  return normaliseCapture(json);
}

function normaliseCapture(json: Record<string, unknown>): PayPalCapture {
  const units = (json.purchase_units as Array<Record<string, unknown>> | undefined) ?? [];
  const cap = (units[0]?.payments as Record<string, unknown> | undefined)?.captures as
    | Array<Record<string, unknown>>
    | undefined;
  const first = cap?.[0];
  const money = (first?.amount ?? (units[0]?.amount as Record<string, unknown> | undefined)) as
    | { currency_code?: string; value?: string }
    | undefined;
  return {
    status: String((first?.status as string) ?? (json.status as string) ?? ""),
    currency: String(money?.currency_code ?? ""),
    amount: Number(money?.value ?? 0) || 0,
    captureId: (first?.id as string) ?? null,
    raw: json,
  };
}

// Validate a pasted clientId/secret by fetching a token; returns a label.
export async function verifyPayPalCreds(
  clientId: string,
  secret: string,
  mode: PayPalMode
): Promise<{ ok: true; label: string } | { ok: false }> {
  try {
    await accessToken({ clientId, secret, mode });
    return { ok: true, label: `${mode === "live" ? "Live" : "Sandbox"} app connected` };
  } catch {
    return { ok: false };
  }
}

/** Verify a webhook's signature with PayPal (requires the studio's webhookId). */
export async function verifyPayPalWebhook(
  cfg: Creds & { webhookId?: string },
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  if (!cfg.webhookId) return false;
  try {
    const base = paypalApiBase(cfg.mode);
    const token = await accessToken(cfg);
    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: cfg.webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
