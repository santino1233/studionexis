import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioStripe } from "@/lib/stripe";
import { externalUrl } from "@/lib/request-url";

// Stripe success landing for a class drop-in paid online: verify the
// session, then create the PAID order + booking exactly once.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const sid = url.searchParams.get("sid") ?? "";

  const tenant = await tenantBySlugOrDomain(slug);
  const stripe = tenant ? studioStripe(tenant) : null;
  if (!tenant || !stripe || !sid) return NextResponse.redirect(externalUrl(req, `/book/${slug}?err=failed`), 303);

  try {
    const co = await stripe.checkout.sessions.retrieve(sid);
    if (co.payment_status !== "paid" || co.metadata?.tenantId !== tenant.id || co.metadata.kind !== "class") {
      return NextResponse.redirect(externalUrl(req, `/book/${slug}?err=failed`), 303);
    }
    const { sessionId, clientId } = co.metadata;
    const qty = Math.min(5, Math.max(1, Number(co.metadata.qty) || 1));

    const already = await db.order.findUnique({ where: { stripeSessionId: sid } });
    if (!already) {
      const session = await db.classSession.findFirstOrThrow({ where: { id: sessionId, tenantId: tenant.id }, include: { classType: true } });
      await db.$transaction(async (tx) => {
        const last = await tx.order.findFirst({ where: { tenantId: tenant.id }, orderBy: { number: "desc" }, select: { number: true } });
        const price = Number(session.classType.price);
        const order = await tx.order.create({
          data: {
            tenantId: tenant.id, clientId, number: (last?.number ?? 0) + 1,
            total: (price * qty).toFixed(2), method: "stripe", status: "PAID", stripeSessionId: sid,
            items: { create: [{ kind: "dropin", refId: session.id, label: `${session.classType.name} (paid online)`, qty, unitPrice: price.toFixed(2) }] },
          },
        });
        await tx.booking.create({
          data: { tenantId: tenant.id, sessionId: session.id, clientId, qty, status: "BOOKED", paymentMethod: "stripe", orderId: order.id },
        }).catch(async (e) => {
          // Already booked (unique sessionId+clientId): attach the payment instead.
          if (e?.code === "P2002") {
            await tx.booking.update({ where: { sessionId_clientId: { sessionId: session.id, clientId } }, data: { paymentMethod: "stripe", orderId: order.id, status: "BOOKED" } });
          } else throw e;
        });
      });
    }
    return NextResponse.redirect(externalUrl(req, `/book/${slug}/bookings?ok=paid`), 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, `/book/${slug}?err=failed`), 303);
  }
}
