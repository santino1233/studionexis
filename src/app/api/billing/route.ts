import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { PLANS } from "@/lib/plans";
import { guardCap } from "@/lib/rbac-server";

// Saves the studio's plan choice. Stripe checkout attaches here once API
// keys exist; until then paid status is managed from HQ.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_billing");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const plan = String(form.get("plan") ?? "");
  const cycle = form.get("cycle") === "annual" ? "annual" : "monthly";
  if (!PLANS.some((p) => p.id === plan)) return NextResponse.redirect(externalUrl(req, "/billing"), 303);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const prev = (tenant.policies ?? {}) as Record<string, unknown>;
  await db.tenant.update({
    where: { id: tenant.id },
    data: { plan, policies: { ...prev, billingCycle: cycle } as Prisma.InputJsonValue },
  });
  return NextResponse.redirect(externalUrl(req, `/billing?saved=1&cycle=${cycle}`), 303);
}
