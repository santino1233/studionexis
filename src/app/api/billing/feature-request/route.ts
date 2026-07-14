import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { featureRequests } from "@/lib/features";

// Studio asks for a bespoke feature — lands in the HQ review queue.
export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const text = String((await req.formData()).get("text") ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.redirect(externalUrl(req, "/billing"), 303);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const prev = (tenant.policies ?? {}) as Record<string, unknown>;
  const requests = [...featureRequests(tenant), { text, at: new Date().toISOString(), status: "NEW" as const }].slice(-20);
  await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, featureRequests: requests } as Prisma.InputJsonValue } });
  return NextResponse.redirect(externalUrl(req, "/billing?saved=feature"), 303);
}
