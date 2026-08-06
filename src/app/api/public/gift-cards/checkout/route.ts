import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioStripe, studioStripeEnabled, toStripeAmount } from "@/lib/stripe";
import { externalUrl } from "@/lib/request-url";
import { GIFT_CARD_MIN, GIFT_CARD_MAX } from "@/lib/gift-cards";

// Customer buys a gift card, charged through the STUDIO's own Stripe (the same
// integration used for online package purchases). The card itself is only
// created after payment is confirmed — see confirm/route.ts. If the studio has
// not connected Stripe, this endpoint cleanly bounces back with ?err=stripe
// (nothing to charge against — no keys are invented).
export async function POST(req: Request) {
  if (!rateLimit(req, "gc-checkout", 8, 60)) return new NextResponse("Slow down.", { status: 429 });

  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const back = `/book/${slug}/gift-cards`;

  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const stripe = studioStripe(tenant);
  if (!stripe || !studioStripeEnabled(tenant)) {
    return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
  }

  // A typed custom amount wins over the preset radio selection.
  const custom = Number(form.get("amountCustom") ?? 0) || 0;
  const preset = Number(form.get("amount") ?? 0) || 0; // NaN for the "custom" radio → 0
  const amount = Math.round((custom > 0 ? custom : preset) * 100) / 100;
  const recipientEmail = String(form.get("recipientEmail") ?? "").trim().slice(0, 200);
  const purchaserEmail = String(form.get("purchaserEmail") ?? "").trim().slice(0, 200);
  const message = String(form.get("message") ?? "").trim().slice(0, 500);
  if (amount < GIFT_CARD_MIN || amount > GIFT_CARD_MAX) {
    return NextResponse.redirect(externalUrl(req, `${back}?err=amount`), 303);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
    return NextResponse.redirect(externalUrl(req, `${back}?err=email`), 303);
  }

  try {
    const origin = externalUrl(req, "").toString().replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: tenant.currency.toLowerCase(),
          unit_amount: toStripeAmount(amount, tenant.currency),
          product_data: {
            name: `Gift card — ${tenant.name}`,
            description: `A ${tenant.currency} ${amount.toFixed(2)} gift card${recipientEmail ? ` for ${recipientEmail}` : ""}`,
          },
        },
      }],
      customer_email: purchaserEmail || undefined,
      // Metadata is echoed back on the success redirect where the card is minted.
      metadata: {
        kind: "giftcard",
        tenantId: tenant.id,
        amount: amount.toFixed(2),
        recipientEmail,
        purchaserEmail,
        message,
      },
      success_url: `${origin}/api/public/gift-cards/confirm?slug=${encodeURIComponent(slug)}&sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${back}?err=cancelled`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
  }
}
