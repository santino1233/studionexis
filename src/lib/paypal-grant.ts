import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { initialExpiry } from "@/lib/memberships";
import { moneyFormatter } from "@/lib/tenant";
import { sendEmail } from "@/lib/mailer";
import { allocateUniqueCode, purchaseEmailBody, GIFT_CARD_VALIDITY_DAYS } from "@/lib/gift-cards";
import type { PayPalCapture } from "@/lib/paypal";

// Turn a *captured* PayPal order into the exact same records a paid Stripe
// checkout would produce — a package Order + ClientPackage, or a minted
// GiftCard — so everything downstream (POS, my-packages, gift-card redemption)
// works identically no matter which processor was used.
//
// The grant is driven entirely by the server-side PayPalOrder intent row written
// at create-order time — never by client input — and is idempotent: the unique
// Order.paypalOrderId / GiftCard.paypalOrderId columns mean a retry, a double
// capture, or a webhook arriving after the browser capture can only ever find
// the existing record instead of granting twice.

export type GrantResult =
  | { ok: true; redirect: string }
  | { ok: false; redirect: string };

const AMOUNT_TOLERANCE = 0.01;

export async function fulfillPayPalOrder(args: {
  orderId: string;
  capture: PayPalCapture;
  slug: string;
  baseUrl: string; // origin, no trailing slash
}): Promise<GrantResult> {
  const { orderId, capture, slug, baseUrl } = args;
  const intent = await db.payPalOrder.findUnique({ where: { paypalId: orderId } });
  if (!intent) return { ok: false, redirect: `/book/${slug}/packages?err=paypal` };

  const backPackages = `/book/${slug}/packages?err=paypal`;
  const backGift = `/book/${slug}/gift-cards?err=stripe`;
  const back = intent.kind === "giftcard" ? backGift : backPackages;

  // The money PayPal actually captured must match what we asked to charge.
  if (
    capture.status !== "COMPLETED" ||
    capture.currency.toUpperCase() !== intent.currency.toUpperCase() ||
    Math.abs(capture.amount - Number(intent.amount)) > AMOUNT_TOLERANCE
  ) {
    return { ok: false, redirect: back };
  }

  const tenant = await db.tenant.findUnique({ where: { id: intent.tenantId } });
  if (!tenant) return { ok: false, redirect: back };

  if (intent.kind === "package") {
    if (!intent.clientId || !intent.packageId) return { ok: false, redirect: back };
    const existing = await db.order.findUnique({ where: { paypalOrderId: orderId } });
    if (!existing) {
      const pkg = await db.package.findFirst({ where: { id: intent.packageId, tenantId: tenant.id } });
      if (!pkg) return { ok: false, redirect: back };
      try {
        await db.$transaction(async (tx) => {
          const last = await tx.order.findFirst({ where: { tenantId: tenant.id }, orderBy: { number: "desc" }, select: { number: true } });
          await tx.order.create({
            data: {
              tenantId: tenant.id, clientId: intent.clientId, number: (last?.number ?? 0) + 1,
              total: pkg.price, method: "paypal", status: "PAID", paypalOrderId: orderId,
              items: { create: [{ kind: "package", refId: pkg.id, label: pkg.name, qty: 1, unitPrice: pkg.price }] },
            },
          });
          await tx.clientPackage.create({
            data: { tenantId: tenant.id, clientId: intent.clientId!, packageId: pkg.id, creditsLeft: pkg.credits, expiresAt: initialExpiry(pkg), pricePaid: pkg.price },
          });
        });
      } catch {
        // Unique paypalOrderId collision → another path already granted; fall through.
      }
    }
    await db.payPalOrder.update({ where: { paypalId: orderId }, data: { status: "CAPTURED", captureId: capture.captureId } }).catch(() => {});
    emitEvent(tenant.id, "order.paid", { total: "", currency: tenant.currency, label: "package (paid online — PayPal)" });
    return { ok: true, redirect: `/book/${slug}/my-packages?ok=paid` };
  }

  // Gift card
  let card = await db.giftCard.findUnique({ where: { paypalOrderId: orderId } });
  if (!card) {
    const amount = Number(intent.amount);
    const code = await allocateUniqueCode(db, tenant.id);
    const expiresAt = new Date(Date.now() + GIFT_CARD_VALIDITY_DAYS * 86400_000);
    try {
      card = await db.$transaction(async (tx) => {
        const created = await tx.giftCard.create({
          data: {
            tenantId: tenant.id, code,
            initialAmount: amount.toFixed(2), balance: amount.toFixed(2), currency: tenant.currency,
            purchaserEmail: intent.purchaserEmail, recipientEmail: intent.recipientEmail, message: intent.message,
            status: "ACTIVE", expiresAt, paypalOrderId: orderId,
          },
        });
        await tx.giftCardTxn.create({ data: { giftCardId: created.id, amount: amount.toFixed(2), type: "PURCHASE", note: "Online purchase (PayPal)" } });
        return created;
      });
    } catch {
      card = await db.giftCard.findUnique({ where: { paypalOrderId: orderId } });
    }

    const to = card?.recipientEmail || card?.purchaserEmail;
    if (card && to) {
      const fmt = moneyFormatter(tenant.currency);
      const viewUrl = `${baseUrl}/book/${slug}/gift-cards/${encodeURIComponent(card.code)}`;
      const { subject, body } = purchaseEmailBody({
        studio: tenant.name, amount: fmt.format(Number(card.initialAmount)), code: card.code, message: card.message, viewUrl,
      });
      await sendEmail({ tenantId: tenant.id, to, subject, body }).catch(() => {});
    }
  }
  await db.payPalOrder.update({ where: { paypalId: orderId }, data: { status: "CAPTURED", captureId: capture.captureId } }).catch(() => {});
  if (!card) return { ok: false, redirect: backGift };
  emitEvent(tenant.id, "order.paid", { total: "", currency: tenant.currency, label: "gift card (paid online — PayPal)" });
  return { ok: true, redirect: `/book/${slug}/gift-cards/${encodeURIComponent(card.code)}?ok=purchased` };
}
