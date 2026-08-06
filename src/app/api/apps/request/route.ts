import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { featureRequests } from "@/lib/features";
import { guardCap } from "@/lib/rbac-server";

// "Request an app" from the App Store — lands in the HQ Feature Requests queue
// so we can see which integrations studios want next.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_apps");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const name = String((await req.formData()).get("name") ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.redirect(externalUrl(req, "/apps?requested=0"), 303);

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const prev = (tenant.policies ?? {}) as Record<string, unknown>;
  const requests = [...featureRequests(tenant), { text: `App request: ${name}`, at: new Date().toISOString(), status: "NEW" as const }].slice(-20);
  await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, featureRequests: requests } as Prisma.InputJsonValue } });
  return NextResponse.redirect(externalUrl(req, "/apps?requested=1"), 303);
}
