import type { Package } from "@prisma/client";
import { db } from "@/lib/db";

// Memberships (Wave 12 Z4): a Package with interval "month"/"year" renews
// automatically — credits reset each period and a renewal order is logged
// as PENDING for the desk to collect (Stripe takes over once connected).

export function isMembership(pkg: Pick<Package, "interval">): boolean {
  return pkg.interval === "month" || pkg.interval === "year";
}

export function periodEnd(from: Date, interval: string): Date {
  const d = new Date(from);
  if (interval === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// First expiry for a fresh purchase.
export function initialExpiry(pkg: Pick<Package, "interval" | "validityDays">): Date {
  return isMembership(pkg) ? periodEnd(new Date(), pkg.interval) : new Date(Date.now() + pkg.validityDays * 86400_000);
}

export function intervalLabel(interval: string): string {
  return interval === "month" ? "/mo" : interval === "year" ? "/yr" : "";
}

// Roll every lapsed membership forward one period: reset credits, extend
// expiry, log a PENDING renewal order. Idempotent per period (expiry only
// moves forward). Frozen memberships are paused — no renewal, no charge.
export async function renewMemberships(): Promise<number> {
  const due = await db.clientPackage.findMany({
    where: {
      frozen: false,
      expiresAt: { lt: new Date() },
      package: { interval: { in: ["month", "year"] }, active: true },
      // Don't auto-renew (or bill) memberships for a suspended/offline studio.
      tenant: { status: { not: "SUSPENDED" } },
    },
    include: { package: true },
    take: 500,
  });

  let renewed = 0;
  for (const cp of due) {
    // Catch up if several periods lapsed, but bill only one renewal.
    let next = periodEnd(cp.expiresAt, cp.package.interval);
    while (next < new Date()) next = periodEnd(next, cp.package.interval);
    await db.$transaction(async (tx) => {
      await tx.clientPackage.update({
        where: { id: cp.id },
        data: { expiresAt: next, creditsLeft: cp.package.credits },
      });
      const last = await tx.order.findFirst({ where: { tenantId: cp.tenantId }, orderBy: { number: "desc" }, select: { number: true } });
      await tx.order.create({
        data: {
          tenantId: cp.tenantId,
          clientId: cp.clientId,
          number: (last?.number ?? 0) + 1,
          total: cp.package.price,
          method: "membership",
          status: "PENDING",
          items: { create: [{ kind: "package", refId: cp.packageId, label: `${cp.package.name} — ${cp.package.interval}ly renewal`, qty: 1, unitPrice: cp.package.price }] },
        },
      });
    });
    renewed++;
  }
  return renewed;
}
