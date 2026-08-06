import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { platformStripe } from "@/lib/stripe";
import { PLANS, annualMonthly } from "@/lib/plans";
import { guardCap } from "@/lib/rbac-server";

// SaaS plan subscription via the PLATFORM Stripe account (env keys).
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_billing");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const stripe = platformStripe();
  if (!stripe) return NextResponse.redirect(externalUrl(req, "/billing?error=nostripe"), 303);

  const form = await req.formData();
  const planId = String(form.get("plan") ?? "");
  const cycle = form.get("cycle") === "annual" ? "annual" : "monthly";
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return NextResponse.redirect(externalUrl(req, "/billing"), 303);
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });

  const monthly = cycle === "annual" ? annualMonthly(plan.monthly) : plan.monthly;
  const origin = externalUrl(req, "").toString().replace(/\/$/, "");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          recurring: cycle === "annual" ? { interval: "year" } : { interval: "month" },
          unit_amount: Math.round((cycle === "annual" ? monthly * 12 : monthly) * 100),
          product_data: { name: `StudioNexis ${plan.name} (${cycle})` },
        },
      }],
      metadata: { tenantId: tenant.id, plan: plan.id, cycle },
      subscription_data: { metadata: { tenantId: tenant.id, plan: plan.id, cycle } },
      success_url: `${origin}/billing?saved=1`,
      cancel_url: `${origin}/billing`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, "/billing?error=stripe"), 303);
  }
}
