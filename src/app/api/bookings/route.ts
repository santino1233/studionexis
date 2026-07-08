import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  const clientId = String(form.get("clientId") ?? "");
  const back = `/schedule/${sessionId}`;

  try {
    await db.$transaction(async (tx) => {
      const session = await tx.classSession.findFirstOrThrow({
        where: { id: sessionId, tenantId: auth.tenantId },
        include: { _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
      });
      const full = session._count.bookings >= session.capacity;

      // Prefer paying with an active package credit.
      const pkg = await tx.clientPackage.findFirst({
        where: { tenantId: auth.tenantId, clientId, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
      });

      const usePkg = !full && !!pkg;
      if (usePkg) {
        await tx.clientPackage.update({ where: { id: pkg!.id }, data: { creditsLeft: { decrement: 1 } } });
      }
      await tx.booking.create({
        data: {
          tenantId: auth.tenantId,
          sessionId,
          clientId,
          status: full ? "WAITLIST" : "BOOKED",
          paymentMethod: full ? null : usePkg ? "package_credit" : "at_studio",
          clientPackageId: usePkg ? pkg!.id : null,
        },
      });
    });
  } catch {
    return NextResponse.redirect(externalUrl(req, `${back}?error=already`), 303);
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
