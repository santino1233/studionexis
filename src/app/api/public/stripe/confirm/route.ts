import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioStripe } from "@/lib/stripe";
import { initialExpiry } from "@/lib/memberships";
import { externalUrl } from "@/lib/request-url";

// Stripe Checkout success landing: verify the session server-side (no
// webhook needed for studio-level payments), grant the package once.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const sid = url.searchParams.get("sid") ?? "";
  const back = `/book/${slug}/my-packages`;

  const tenant = await tenantBySlugOrDomain(slug);
  const stripe = tenant ? studioStripe(tenant) : null;
  if (!tenant || !stripe || !sid) return NextResponse.redirect(externalUrl(req, `/book/${slug}/packages?err=stripe`), 303);

  try {
    const session = await stripe.checkout.sessions.retrieve(sid);
    if (session.payment_status !== "paid" || session.metadata?.tenantId !== tenant.id) {
      return NextResponse.redirect(externalUrl(req, `/book/${slug}/packages?err=stripe`), 303);
    }
    const { packageId, clientId } = session.metadata;
    const already = await db.order.findUnique({ where: { stripeSessionId: sid } });
    if (!already) {
      const pkg = await db.package.findFirstOrThrow({ where: { id: packageId, tenantId: tenant.id } });
      await db.$transaction(async (tx) => {
        const last = await tx.order.findFirst({ where: { tenantId: tenant.id }, orderBy: { number: "desc" }, select: { number: true } });
        await tx.order.create({
          data: {
            tenantId: tenant.id, clientId, number: (last?.number ?? 0) + 1,
            total: pkg.price, method: "stripe", status: "PAID", stripeSessionId: sid,
            items: { create: [{ kind: "package", refId: pkg.id, label: pkg.name, qty: 1, unitPrice: pkg.price }] },
          },
        });
        await tx.clientPackage.create({
          data: { tenantId: tenant.id, clientId, packageId: pkg.id, creditsLeft: pkg.credits, expiresAt: initialExpiry(pkg), pricePaid: pkg.price },
        });
      });
    }
    return NextResponse.redirect(externalUrl(req, `${back}?ok=paid`), 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, `/book/${slug}/packages?err=stripe`), 303);
  }
}
