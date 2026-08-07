import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";
import { hasFeature } from "@/lib/features";
import { audit } from "@/lib/hq";
import { domainPolicyOf, makeDomainPolicy } from "@/lib/domain";
import { checkDomainDns } from "@/lib/domain-verify";

// "Verify now" from the Settings → Domain tab. Runs a live DNS check and
// advances the lifecycle:
//   points here + not live  -> VERIFYING (operator provisioner will issue the
//                              cert + nginx vhost and flip it LIVE)
//   points here + live      -> stays LIVE (re-affirms the check timestamp)
//   no record yet           -> PENDING (keep waiting)
//   points elsewhere/invalid-> FAILED (with a short reason)
// It never issues a certificate or touches nginx — that requires root and is
// done out-of-band by scripts/domain-provisioner.sh.
export async function POST(req: Request) {
  const denied = await guardCap(req, "manage_settings");
  if (denied) return denied;
  const auth = await getSession();
  if (!auth || ["STAFF", "INSTRUCTOR"].includes(auth.role)) {
    return NextResponse.redirect(externalUrl(req, "/login"), 303);
  }

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const back = "/settings?tab=domain";

  if (!hasFeature(tenant, "custom-domain") || !tenant.customDomain) {
    return NextResponse.redirect(externalUrl(req, `${back}&error=domain`), 303);
  }

  const prev = (tenant.policies ?? {}) as Record<string, unknown>;
  const wasLive = domainPolicyOf(tenant.policies)?.status === "LIVE";
  const check = await checkDomainDns(tenant.customDomain);

  let policy;
  if (check.pointsHere) {
    policy = makeDomainPolicy(wasLive ? "LIVE" : "VERIFYING");
  } else if (check.reason === "no DNS record yet") {
    policy = makeDomainPolicy("PENDING");
  } else {
    policy = makeDomainPolicy("FAILED", check.reason);
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: { policies: { ...prev, domain: policy } as Prisma.InputJsonValue },
  });
  audit({
    tenantId: tenant.id,
    actor: auth.name,
    role: auth.role,
    action: "domain-verify",
    detail: `${tenant.customDomain} → ${policy.status}`,
  });

  return NextResponse.redirect(externalUrl(req, `${back}&verified=${policy.status}`), 303);
}
