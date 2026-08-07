import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studioPayPalConfig, getPayPalOrder, verifyPayPalWebhook } from "@/lib/paypal";
import { fulfillPayPalOrder } from "@/lib/paypal-grant";
import { externalUrl } from "@/lib/request-url";

// PayPal webhook reconciler. The browser capture is the primary grant path; this
// endpoint is the safety net for the case where the customer closes the tab
// after paying. It resolves the tenant from our own intent row, verifies the
// webhook SIGNATURE against that studio's PayPal app (requires the studio to
// have saved its webhook id), then re-runs the SAME idempotent grant — so a
// webhook arriving after a successful browser capture is a harmless no-op.
//
// Register this URL in the studio's PayPal app:  /api/public/paypal/webhook
export async function POST(req: Request) {
  const raw = await req.text();
  let event: Record<string, unknown> = {};
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const orderId = extractOrderId(event);
  if (!orderId) return NextResponse.json({ ok: true }); // nothing we track — ack

  const intent = await db.payPalOrder.findUnique({ where: { paypalId: orderId } });
  if (!intent) return NextResponse.json({ ok: true }); // not ours — ack

  const tenant = await db.tenant.findUnique({ where: { id: intent.tenantId } });
  if (!tenant) return NextResponse.json({ ok: true });
  const cfg = studioPayPalConfig(tenant);

  // Verify the signature. Without a configured webhookId we cannot trust the
  // event, so we ack (200, no retries) but do NOT grant — the browser capture
  // path remains authoritative.
  const verified = await verifyPayPalWebhook(cfg, req.headers, raw);
  if (!verified) return NextResponse.json({ ok: true });

  const type = String(event.event_type ?? "");
  if (type === "PAYMENT.CAPTURE.COMPLETED" || type === "CHECKOUT.ORDER.COMPLETED" || type === "CHECKOUT.ORDER.APPROVED") {
    try {
      const capture = await getPayPalOrder(cfg, orderId);
      const origin = externalUrl(req, "").toString().replace(/\/$/, "");
      await fulfillPayPalOrder({ orderId, capture, slug: tenant.slug, baseUrl: origin });
    } catch {
      // Reconcile best-effort; PayPal will retry on a non-2xx, but we still ack.
    }
  }
  return NextResponse.json({ ok: true });
}

function extractOrderId(event: Record<string, unknown>): string | null {
  const resource = event.resource as Record<string, unknown> | undefined;
  if (!resource) return null;
  const related = ((resource.supplementary_data as Record<string, unknown> | undefined)?.related_ids ??
    {}) as Record<string, unknown>;
  return (
    (related.order_id as string | undefined) ??
    (resource.id as string | undefined) ??
    null
  );
}
