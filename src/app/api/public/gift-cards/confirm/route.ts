import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioStripe } from "@/lib/stripe";
import { moneyFormatter } from "@/lib/tenant";
import { sendEmail } from "@/lib/mailer";
import { externalUrl } from "@/lib/request-url";
import { allocateUniqueCode, purchaseEmailBody, GIFT_CARD_VALIDITY_DAYS } from "@/lib/gift-cards";

// Stripe Checkout success landing for a gift-card purchase. Mirrors the package
// confirm flow: verify the session server-side (no webhook needed for
// studio-level payments), then mint the card exactly once. Idempotency is
// enforced by the unique GiftCard.stripeSessionId — a refresh/retry of this URL
// finds the existing card instead of creating a duplicate.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const sid = url.searchParams.get("sid") ?? "";
  const back = `/book/${slug}/gift-cards`;

  const tenant = await tenantBySlugOrDomain(slug);
  const stripe = tenant ? studioStripe(tenant) : null;
  if (!tenant || !stripe || !sid) return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);

  try {
    const session = await stripe.checkout.sessions.retrieve(sid);
    if (session.payment_status !== "paid" || session.metadata?.tenantId !== tenant.id || session.metadata?.kind !== "giftcard") {
      return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
    }

    let card = await db.giftCard.findUnique({ where: { stripeSessionId: sid } });
    if (!card) {
      const amount = Math.round((Number(session.metadata.amount ?? 0) || 0) * 100) / 100;
      const recipientEmail = (session.metadata.recipientEmail || "").trim() || null;
      const purchaserEmail = (session.metadata.purchaserEmail || session.customer_details?.email || "").trim() || null;
      const message = (session.metadata.message || "").trim() || null;
      const code = await allocateUniqueCode(db, tenant.id);
      const expiresAt = new Date(Date.now() + GIFT_CARD_VALIDITY_DAYS * 86400_000);
      card = await db.$transaction(async (tx) => {
        const created = await tx.giftCard.create({
          data: {
            tenantId: tenant.id,
            code,
            initialAmount: amount.toFixed(2),
            balance: amount.toFixed(2),
            currency: tenant.currency,
            purchaserEmail,
            recipientEmail,
            message,
            status: "ACTIVE",
            expiresAt,
            stripeSessionId: sid,
          },
        });
        await tx.giftCardTxn.create({
          data: { giftCardId: created.id, amount: amount.toFixed(2), type: "PURCHASE", note: "Online purchase" },
        });
        return created;
      });

      // Email the recipient (falls back to the purchaser). Non-fatal on failure —
      // the card exists regardless and is viewable via the link.
      const to = card.recipientEmail || card.purchaserEmail;
      if (to) {
        const fmt = moneyFormatter(tenant.currency);
        const viewUrl = externalUrl(req, `/book/${slug}/gift-cards/${encodeURIComponent(card.code)}`).toString();
        const { subject, body } = purchaseEmailBody({
          studio: tenant.name,
          amount: fmt.format(Number(card.initialAmount)),
          code: card.code,
          message: card.message,
          viewUrl,
        });
        await sendEmail({ tenantId: tenant.id, to, subject, body }).catch(() => {});
      }
    }

    return NextResponse.redirect(externalUrl(req, `/book/${slug}/gift-cards/${encodeURIComponent(card.code)}?ok=purchased`), 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
  }
}
