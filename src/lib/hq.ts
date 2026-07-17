import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PLANS, annualMonthly } from "@/lib/plans";
import { customFeatures } from "@/lib/features";
import type { Tenant } from "@prisma/client";

// HQ v2 helpers (Wave 16).

export async function assertHq(secret: string) {
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN" || secret !== (process.env.HQ_PATH ?? "").replace(/^hq\//, "")) notFound();
  return auth;
}

export function audit(input: { tenantId?: string | null; actor: string; role?: string; action: string; detail?: string }) {
  void db.auditLog.create({
    data: { tenantId: input.tenantId ?? null, actor: input.actor, role: input.role ?? "SUPERADMIN", action: input.action, detail: input.detail ?? null },
  }).catch(() => {});
}

export function mrrOf(t: Pick<Tenant, "plan" | "status" | "policies">): number {
  if (t.status !== "ACTIVE") return 0;
  const plan = PLANS.find((p) => p.id === t.plan);
  const cycle = ((t.policies ?? {}) as { billingCycle?: string }).billingCycle;
  const planM = plan ? (cycle === "annual" ? annualMonthly(plan.monthly) : plan.monthly) : 0;
  return planM + customFeatures(t).filter((f) => f.active).reduce((n, f) => n + f.price, 0);
}

export type HqTags = { notes?: string; tags?: string[]; comp?: boolean };
export function hqTagsOf(t: Pick<Tenant, "policies">): HqTags {
  return (((t.policies ?? {}) as Record<string, unknown>).hq ?? {}) as HqTags;
}

// 0–100 health from activity, bookings, payment status and support load.
export function healthScore(x: {
  status: string;
  lastStaffLogin: Date | null;
  bookings30: number;
  bookingsPrev30: number;
  openTickets: number;
}): { score: number; label: string; tone: string } {
  let score = 50;
  const daysSinceLogin = x.lastStaffLogin ? (Date.now() - x.lastStaffLogin.getTime()) / 86400_000 : 99;
  score += daysSinceLogin < 2 ? 20 : daysSinceLogin < 7 ? 10 : daysSinceLogin < 21 ? 0 : -20;
  score += x.bookings30 > 50 ? 20 : x.bookings30 > 10 ? 10 : x.bookings30 > 0 ? 0 : -15;
  if (x.bookingsPrev30 > 0) score += x.bookings30 >= x.bookingsPrev30 ? 5 : -10;
  score += x.status === "ACTIVE" ? 5 : x.status === "TRIAL" ? 0 : -25;
  score -= Math.min(15, x.openTickets * 5);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? "Healthy" : score >= 40 ? "Watch" : "At risk";
  const tone = score >= 70 ? "bg-green-wash text-green" : score >= 40 ? "bg-brand-wash text-brand" : "bg-rose/10 text-rose";
  return { score, label, tone };
}
