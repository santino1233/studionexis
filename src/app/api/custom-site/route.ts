import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { platformStripe } from "@/lib/stripe";
import { guardCap } from "@/lib/rbac-server";

// "We build it for you" custom-website purchase (Wave 12 website suite).
//
// Charged on the PLATFORM (Nexis HQ) Stripe account — NEVER the studio's own
// key — because this is Nexis selling a done-for-you service to the studio.
// Self-gates when STRIPE_SECRET_KEY is unset (platformStripe() → null): the
// page renders a "not available yet" state and this route bounces with
// ?error=unavailable, so no money can be requested against a missing account.
export const CUSTOM_SITE_PRICE_USD = 99;

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_website");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const stripe = platformStripe();
  if (!stripe) return NextResponse.redirect(externalUrl(req, "/website/custom?error=unavailable"), 303);

  const form = await req.formData();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const name = g("name").slice(0, 120);
  const email = g("email").slice(0, 160);
  const phone = g("phone").slice(0, 60);
  if (!name || !email) return NextResponse.redirect(externalUrl(req, "/website/custom?error=contact"), 303);

  const brief = {
    businessName: g("businessName").slice(0, 160),
    goals: g("goals").slice(0, 4000),
    style: g("style").slice(0, 2000),
    references: g("references").slice(0, 2000),
    brandAssets: g("brandAssets").slice(0, 2000),
    extra: g("extra").slice(0, 4000),
    name,
    email,
    phone,
    submittedBy: auth.name,
  };
  const contact = [name, email, phone].filter(Boolean).join(" · ").slice(0, 300);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const origin = externalUrl(req, "").toString().replace(/\/$/, "");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: CUSTOM_SITE_PRICE_USD * 100,
          product_data: {
            name: "StudioNexis — Done-for-you website",
            description: "We design & build your studio website within 3 business days.",
          },
        },
      }],
      metadata: { kind: "custom_site", tenantId: tenant.id },
      success_url: `${origin}/website/custom?paid=1`,
      cancel_url: `${origin}/website/custom?cancelled=1`,
    });
    // Mint the order up-front (status NEW, amountPaid 0) so the full brief is
    // persisted without hitting Stripe metadata size limits. The platform
    // webhook flips amountPaid on checkout.session.completed — idempotent on the
    // unique stripeSessionId. The HQ queue only shows orders where amountPaid>0,
    // so abandoned checkouts never reach fulfilment.
    await db.customSiteOrder.create({
      data: { tenantId: tenant.id, contact, brief: brief as Prisma.InputJsonValue, stripeSessionId: session.id },
    });
    return NextResponse.redirect(session.url!, 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, "/website/custom?error=stripe"), 303);
  }
}
