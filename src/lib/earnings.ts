import { db } from "@/lib/db";

// Class revenue = drop-in money collected for this session (the drop-in
// line of each attendee's checkout order) + the per-class value of every
// package credit spent on it (price paid / credits in the pack).
// Instructor earning = revenue × their commission rate.
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
  for (const b of session.bookings) {
    if (b.order) {
      const dropin = b.order.items.find((i) => i.kind === "dropin" && i.refId === sessionId);
      if (dropin) revenue += Number(dropin.unitPrice) * dropin.qty;
    } else if (b.clientPackage) {
      revenue += Number(b.clientPackage.pricePaid) / Math.max(1, b.clientPackage.package.credits);
    }
  }
  revenue = Math.round(revenue * 100) / 100;
  const rate = Number(session.instructor?.commissionRate ?? 0);
  const earnings = Math.round(revenue * rate) / 100;
  return { revenue, earnings, rate };
}
