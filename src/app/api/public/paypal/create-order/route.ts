import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { studioPayPalConfig, studioPayPalEnabled, createPayPalOrder } from "@/lib/paypal";
import { GIFT_CARD_MIN, GIFT_CARD_MAX } from "@/lib/gift-cards";

// Create a PayPal Orders-v2 order for a package or gift-card purchase, using the
// STUDIO's own PayPal app. The amount is always computed server-side (package
// price from the DB; gift-card amount validated against the studio's limits) —
// the client never dictates what it will be charged. The order + a server-side
// intent row are written; the browser SDK then approves and we capture in
// /api/public/paypal/capture. If PayPal isn't enabled this cleanly 400s and no
// button ever reaches this route.
export async function POST(req: Request) {
  if (!rateLimit(req, "pp-create", 12, 60)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const slug = String(body.slug ?? "");
  const kind = String(body.kind ?? "");
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.json({ error: "unavailable" }, { status: 400 });
  const cfg = studioPayPalConfig(tenant);
  if (!studioPayPalEnabled(tenant)) return NextResponse.json({ error: "paypal_off" }, { status: 400 });

  try {
    if (kind === "package") {
      const packageId = String(body.packageId ?? "");
      const customer = await getCustomerSession();
      if (!customer || customer.tenantId !== tenant.id) return NextResponse.json({ error: "auth" }, { status: 401 });
      const pkg = await db.package.findFirst({ where: { id: packageId, tenantId: tenant.id, active: true } });
      const client = await db.client.findFirst({ where: { id: customer.clientId, tenantId: tenant.id } });
      if (!pkg || !client) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const amount = Number(pkg.price);
      const order = await createPayPalOrder(cfg, {
        currency: tenant.currency,
        amount,
        description: `${pkg.name} — ${tenant.name}`,
        referenceId: "package",
      });
      await db.payPalOrder.create({
        data: {
          paypalId: order.id, tenantId: tenant.id, kind: "package",
          clientId: client.id, packageId: pkg.id,
          amount: amount.toFixed(2), currency: tenant.currency, status: "CREATED",
        },
      });
      return NextResponse.json({ id: order.id });
    }

    if (kind === "giftcard") {
      const custom = Number(body.amountCustom ?? 0) || 0;
      const preset = Number(body.amount ?? 0) || 0;
      const amount = Math.round((custom > 0 ? custom : preset) * 100) / 100;
      const recipientEmail = String(body.recipientEmail ?? "").trim().slice(0, 200);
      const purchaserEmail = String(body.purchaserEmail ?? "").trim().slice(0, 200);
      const message = String(body.message ?? "").trim().slice(0, 500);
      if (amount < GIFT_CARD_MIN || amount > GIFT_CARD_MAX) return NextResponse.json({ error: "amount" }, { status: 400 });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) return NextResponse.json({ error: "email" }, { status: 400 });

      const order = await createPayPalOrder(cfg, {
        currency: tenant.currency,
        amount,
        description: `Gift card — ${tenant.name}`,
        referenceId: "giftcard",
      });
      await db.payPalOrder.create({
        data: {
          paypalId: order.id, tenantId: tenant.id, kind: "giftcard",
          amount: amount.toFixed(2), currency: tenant.currency, status: "CREATED",
          recipientEmail: recipientEmail || null, purchaserEmail: purchaserEmail || null, message: message || null,
        },
      });
      return NextResponse.json({ id: order.id });
    }

    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "paypal" }, { status: 502 });
  }
}
