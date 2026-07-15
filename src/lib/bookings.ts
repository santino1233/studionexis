import type { Prisma } from "@prisma/client";

// Promote waitlisted bookings (each holds one seat) into freed capacity,
// oldest first — auto-spending a package credit when the client has one.
export async function promoteWaitlist(tx: Prisma.TransactionClient, tenantId: string, sessionId: string, seatsFreed: number) {
  if (seatsFreed <= 0) return;
  const waiting = await tx.booking.findMany({
    where: { sessionId, status: "WAITLIST" },
    orderBy: { createdAt: "asc" },
    take: seatsFreed,
  });
  for (const next of waiting) {
    const pkg = await tx.clientPackage.findFirst({
      where: { tenantId, clientId: next.clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "asc" },
    });
    if (pkg) await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: 1 } } });
    await tx.booking.update({
      where: { id: next.id },
      data: { status: "BOOKED", paymentMethod: pkg ? "package_credit" : "at_studio", clientPackageId: pkg?.id ?? null },
    });
  }
}
