import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { domainPolicyOf, makeDomainPolicy } from "@/lib/domain";
import { checkDomainDns } from "@/lib/domain-verify";

// Periodic DNS re-check for every studio custom domain. This is the root-free
// half of the lifecycle — it only touches the DB, never certbot/nginx — so it
// can run from the app on a plain cron (curl with CRON_TOKEN). It:
//   • promotes PENDING → VERIFYING once DNS starts pointing here (so the
//     operator provisioner picks it up on its next run), and
//   • demotes LIVE → FAILED the moment a live domain stops resolving here, so
//     site-url.ts immediately falls back to the <slug>.<base> subdomain instead
//     of serving a dead custom domain.
// It deliberately does NOT promote VERIFYING → LIVE: that transition means a
// cert was issued and nginx is serving the domain, which only the root
// provisioner (scripts/domain-provisioner.sh) can attest to.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tenants = await db.tenant.findMany({
    where: { customDomain: { not: null } },
    select: { id: true, customDomain: true, policies: true },
  });

  const changes: { domain: string; from: string | null; to: string }[] = [];

  for (const t of tenants) {
    const domain = t.customDomain!;
    const cur = domainPolicyOf(t.policies)?.status ?? null;
    const check = await checkDomainDns(domain);

    let next: ReturnType<typeof makeDomainPolicy> | null = null;
    if (cur === "LIVE") {
      // Safety fallback: a live domain that no longer points here is broken.
      if (!check.pointsHere) next = makeDomainPolicy("FAILED", check.reason);
    } else if (cur === "PENDING" || cur === null) {
      if (check.pointsHere) next = makeDomainPolicy("VERIFYING");
    } else if (cur === "FAILED") {
      // Recovered: DNS now points here again → hand back to the provisioner.
      if (check.pointsHere) next = makeDomainPolicy("VERIFYING");
    }
    // VERIFYING is left untouched — the provisioner owns VERIFYING → LIVE/FAILED.

    if (next) {
      const prev = (t.policies ?? {}) as Record<string, unknown>;
      await db.tenant.update({
        where: { id: t.id },
        data: { policies: { ...prev, domain: next } as Prisma.InputJsonValue },
      });
      changes.push({ domain, from: cur, to: next.status });
    }
  }

  return NextResponse.json({ ok: true, checked: tenants.length, changes });
}
