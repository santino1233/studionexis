import type { User } from "@prisma/client";
import { db } from "@/lib/db";

// ── Commission engines (Wave 11 Y4) ───────────────────────────────────
// A user earns from a class by one of four modes (User.commissionMode):
//   percent          — commissionRate % of the class revenue
//   percent_tiered   — % from a tier table keyed on classes taught this
//                      month (e.g. 50→25%, 100→30%); `retroactive` decides
//                      whether the final tier re-prices the whole month
//                      (applied in the payroll report) or only classes
//                      after the threshold (per-class freeze)
//   fixed_per_class  — flat amount per class taught
//   per_head         — amount from a people table (1→$20, 2→$30, …)

export type CommissionTier = { classes: number; pct: number };
export type PerHeadRow = { people: number; amount: number };
export type CommissionConfig = {
  tiers?: CommissionTier[];
  retroactive?: boolean;
  amount?: number;
  rows?: PerHeadRow[];
};

export function configOf(user: Pick<User, "commissionConfig">): CommissionConfig {
  return (user.commissionConfig ?? {}) as CommissionConfig;
}

export function tierPct(tiers: CommissionTier[] | undefined, monthClasses: number): number {
  let pct = 0;
  for (const t of [...(tiers ?? [])].sort((a, b) => a.classes - b.classes)) {
    if (monthClasses >= t.classes) pct = t.pct;
  }
  return pct;
}

export function perHeadAmount(rows: PerHeadRow[] | undefined, people: number): number {
  let amount = 0;
  for (const r of [...(rows ?? [])].sort((a, b) => a.people - b.people)) {
    if (people >= r.people) amount = r.amount;
  }
  return people > 0 ? amount : 0;
}

export function commissionForClass(
  user: Pick<User, "commissionMode" | "commissionRate" | "commissionConfig">,
  args: { revenue: number; attendees: number; monthClasses: number },
): { earnings: number; label: string } {
  const cfg = configOf(user);
  switch (user.commissionMode) {
    case "percent_tiered": {
      const pct = tierPct(cfg.tiers, args.monthClasses);
      return { earnings: (args.revenue * pct) / 100, label: `${pct}% (tier)` };
    }
    case "fixed_per_class":
      return { earnings: cfg.amount ?? 0, label: `flat/class` };
    case "per_head":
      return { earnings: perHeadAmount(cfg.rows, args.attendees), label: `${args.attendees} ppl` };
    default: {
      const rate = Number(user.commissionRate);
      return { earnings: (args.revenue * rate) / 100, label: `${rate}%` };
    }
  }
}

// Class revenue = drop-in money collected for this session (the drop-in
// line of each attendee's checkout order) + the per-class value of every
// package credit spent on it (price paid / credits in the pack) × seats.
export async function computeSessionFinancials(sessionId: string) {
  const session = await db.classSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      instructor: true,
      bookings: {
        where: { status: { in: ["BOOKED", "CHECKED_IN"] } },
        include: {
          clientPackage: { include: { package: true } },
          order: { include: { items: true } },
        },
      },
    },
  });

  let revenue = 0;
  let attendees = 0;
  for (const b of session.bookings) {
    attendees += b.qty;
    if (b.order) {
      const dropin = b.order.items.find((i) => i.kind === "dropin" && i.refId === sessionId);
      if (dropin) revenue += Number(dropin.unitPrice) * dropin.qty;
    } else if (b.clientPackage) {
      revenue += (Number(b.clientPackage.pricePaid) / Math.max(1, b.clientPackage.package.credits)) * b.qty;
    }
  }
  revenue = Math.round(revenue * 100) / 100;

  if (!session.instructor) return { revenue, earnings: 0, rate: 0, label: "—" };

  // Classes taught this month, counting this one — the tier basis.
  const monthStart = new Date(Date.UTC(session.startsAt.getUTCFullYear(), session.startsAt.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(session.startsAt.getUTCFullYear(), session.startsAt.getUTCMonth() + 1, 1));
  const monthClasses =
    (await db.classSession.count({
      where: {
        tenantId: session.tenantId,
        instructorId: session.instructorId,
        status: "COMPLETED",
        startsAt: { gte: monthStart, lt: monthEnd },
        NOT: { id: session.id },
      },
    })) + 1;

  const { earnings, label } = commissionForClass(session.instructor, { revenue, attendees, monthClasses });
  return {
    revenue,
    earnings: Math.round(earnings * 100) / 100,
    rate: Number(session.instructor.commissionRate),
    label,
  };
}
