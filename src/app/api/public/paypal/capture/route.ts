import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioPayPalConfig, studioPayPalEnabled, capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { fulfillPayPalOrder } from "@/lib/paypal-grant";
import { externalUrl } from "@/lib/request-url";

// Approve → capture. The browser tells us WHICH order to capture; we then call
// PayPal ourselves, confirm the capture COMPLETED and that the money matches the
// server-side intent, and only then grant the purchase. The client is never
// trusted for the amount or for the fact of payment — everything is re-verified
// against PayPal here before any package/gift-card is created.
export async function POST(req: Request) {
  if (!rateLimit(req, "pp-capture", 12, 60)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const slug = String(body.slug ?? "");
  const orderId = String(body.orderID ?? body.orderId ?? "");
  if (!orderId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant) return NextResponse.json({ error: "unavailable" }, { status: 400 });
  const cfg = studioPayPalConfig(tenant);
  if (!studioPayPalEnabled(tenant)) return NextResponse.json({ error: "paypal_off" }, { status: 400 });

  const origin = externalUrl(req, "").toString().replace(/\/$/, "");
  try {
    let capture;
    try {
      capture = await capturePayPalOrder(cfg, orderId);
    } catch {
      // Already captured (e.g. a retried approve) — read the order back instead.
      capture = await getPayPalOrder(cfg, orderId);
    }
    const result = await fulfillPayPalOrder({ orderId, capture, slug, baseUrl: origin });
    return NextResponse.json(result, { status: result.ok ? 200 : 402 });
  } catch {
    return NextResponse.json({ ok: false, redirect: `/book/${slug}/packages?err=paypal` }, { status: 502 });
  }
}
