import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { studioStripe, toStripeAmount } from "@/lib/stripe";
import { externalUrl } from "@/lib/request-url";

// Member buys a package/membership online through the studio's Stripe.
export async function POST(req: Request) {
  if (!rateLimit(req, "stripe-co", 10, 60)) return new NextResponse("Slow down.", { status: 429 });

  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const packageId = String(form.get("packageId") ?? "");
  const back = `/book/${slug}/packages`;

  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const stripe = studioStripe(tenant);
  const customer = await getCustomerSession();
  if (!stripe || !customer || customer.tenantId !== tenant.id) {
    return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
  }
  const pkg = await db.package.findFirst({ where: { id: packageId, tenantId: tenant.id, active: true } });
  const client = await db.client.findFirst({ where: { id: customer.clientId, tenantId: tenant.id } });
  if (!pkg || !client) return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);

  try {
    const origin = externalUrl(req, "").toString().replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: tenant.currency.toLowerCase(),
          unit_amount: toStripeAmount(Number(pkg.price), tenant.currency),
          product_data: { name: `${pkg.name} — ${tenant.name}`, description: pkg.interval !== "none" ? `${pkg.credits} credits per ${pkg.interval}` : `${pkg.credits} class credits` },
        },
      }],
      customer_email: client.email ?? undefined,
      metadata: { tenantId: tenant.id, packageId: pkg.id, clientId: client.id },
      success_url: `${origin}/api/public/stripe/confirm?slug=${encodeURIComponent(slug)}&sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${back}?err=cancelled`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, `${back}?err=stripe`), 303);
  }
}
