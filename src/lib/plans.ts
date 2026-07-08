import { db } from "@/lib/db";
import type { Tenant } from "@prisma/client";

export const TRIAL_DAYS = 7;
export const ANNUAL_DISCOUNT = 0.2;

export type PlanId = "starter" | "growth" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number; // USD
  limits: { clients: number | null; staff: number | null; bookingsPerMonth: number | null };
  sms: boolean;
  blurb: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 36,
    limits: { clients: 500, staff: 10, bookingsPerMonth: 2000 },
    sms: false,
    blurb: "Everything a growing studio needs to run the day.",
    features: [
      "Up to 500 active clients",
      "Up to 10 staff & instructors",
      "2,000 bookings / month",
      "Online payments (Stripe)",
      "Booking website & client portal",
      "Point of sale, packages & vouchers",
      "Schedule, waitlists & check-ins",
      "Analytics, expenses & P&L",
      "Email confirmations & reminders",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 49,
    limits: { clients: 1500, staff: 20, bookingsPerMonth: 4000 },
    sms: true,
    blurb: "For busy studios that live on their schedule.",
    features: [
      "Everything in Starter",
      "Up to 1,500 active clients",
      "Up to 20 staff & instructors",
      "4,000 bookings / month",
      "SMS notifications (Twilio)",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 75,
    limits: { clients: null, staff: null, bookingsPerMonth: null },
    sms: true,
    blurb: "No ceilings — for multi-room and multi-team studios.",
    features: [
      "Everything in Growth",
      "Unlimited active clients",
      "Unlimited staff & instructors",
      "Unlimited bookings",
      "Priority support",
    ],
  },
];

export const ADDONS = [
  { name: "SMS credits", note: "Pay as you go — powers reminders & waitlist texts" },
  { name: "Custom website & domain", note: "Your site on your own domain, certificate included" },
];

export function annualMonthly(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

// Effective limits: plan limits, overridable per-tenant from HQ via
// policies.limits (also how we verify enforcement without bulk data).
export function getLimits(tenant: Tenant): Plan["limits"] {
  const plan = getPlan(tenant.plan);
  const override = ((tenant.policies ?? {}) as { limits?: Partial<Plan["limits"]> }).limits ?? {};
  return { ...plan.limits, ...override };
}

export type LimitCheck = { ok: true } | { ok: false; reason: string };

export async function checkClientLimit(tenant: Tenant): Promise<LimitCheck> {
  const { clients } = getLimits(tenant);
  if (clients == null) return { ok: true };
  const used = await db.client.count({ where: { tenantId: tenant.id } });
  return used < clients ? { ok: true } : { ok: false, reason: `Your plan includes up to ${clients.toLocaleString()} clients — upgrade to add more.` };
}

export async function checkStaffLimit(tenant: Tenant): Promise<LimitCheck> {
  const { staff } = getLimits(tenant);
  if (staff == null) return { ok: true };
  const used = await db.user.count({ where: { tenantId: tenant.id, active: true } });
  return used < staff ? { ok: true } : { ok: false, reason: `Your plan includes up to ${staff} team members — upgrade to add more.` };
}

export async function checkBookingLimit(tenant: Tenant): Promise<LimitCheck> {
  const { bookingsPerMonth } = getLimits(tenant);
  if (bookingsPerMonth == null) return { ok: true };
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const used = await db.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: monthStart } } });
  return used < bookingsPerMonth ? { ok: true } : { ok: false, reason: `This month's booking limit (${bookingsPerMonth.toLocaleString()}) is reached — upgrade for more.` };
}

export async function planUsage(tenant: Tenant) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [clients, staff, bookings] = await Promise.all([
    db.client.count({ where: { tenantId: tenant.id } }),
    db.user.count({ where: { tenantId: tenant.id, active: true } }),
    db.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: monthStart } } }),
  ]);
  return { clients, staff, bookings };
}
