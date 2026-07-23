import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { platformStripe } from "@/lib/stripe";

// Platform webhook (SaaS subscriptions). Configure in the Stripe dashboard:
// endpoint https://app.studionexis.com/api/stripe/webhook with
// STRIPE_WEBHOOK_SECRET in .env. Dormant until both env keys exist.
export async function POST(req: Request) {
  const stripe = platformStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature") ?? "";
    event = stripe.webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "bad-signature" }, { status: 400 });
  }

  const patchTenant = async (tenantId: string | undefined, data: Prisma.TenantUpdateInput) => {
    if (!tenantId) return;
    await db.tenant.update({ where: { id: tenantId }, data }).catch(() => {});
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && s.metadata?.tenantId && s.metadata.plan) {
        const tenant = await db.tenant.findUnique({ where: { id: s.metadata.tenantId } });
        const prev = (tenant?.policies ?? {}) as Record<string, unknown>;
        await patchTenant(s.metadata.tenantId, {
          plan: s.metadata.plan,
          status: "ACTIVE",
          policies: { ...prev, billingCycle: s.metadata.cycle ?? "monthly", stripeSubscriptionId: s.subscription as string } as Prisma.InputJsonValue,
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as unknown as { subscription_details?: { metadata?: { tenantId?: string } }; parent?: { subscription_details?: { metadata?: { tenantId?: string } } } };
      await patchTenant(inv.subscription_details?.metadata?.tenantId ?? inv.parent?.subscription_details?.metadata?.tenantId, { status: "PAST_DUE" });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await patchTenant(sub.metadata?.tenantId, { status: "PAST_DUE" });
      break;
    }
  }
  return NextResponse.json({ received: true });
}
