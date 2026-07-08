import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const sessionId = String(form.get("sessionId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const back = `/book/${slug}`;

  if (!name || (!phone && !email)) {
    return NextResponse.redirect(externalUrl(req, `${back}?err=missing&s=${sessionId}`), 303);
  }

  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  try {
    const result = await db.$transaction(async (tx) => {
      const session = await tx.classSession.findFirstOrThrow({
        where: { id: sessionId, tenantId: tenant.id, status: "SCHEDULED", startsAt: { gt: new Date() } },
        include: { _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } } },
      });

      // Match an existing client by phone/email, else create one.
      let client = await tx.client.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
        },
      });
      if (!client) {
        client = await tx.client.create({
          data: { tenantId: tenant.id, name, phone: phone || null, email: email || null, channel: "website" },
        });
      }

      const full = session._count.bookings >= session.capacity;
      const pkg = await tx.clientPackage.findFirst({
        where: { tenantId: tenant.id, clientId: client.id, creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
      });
      const usePkg = !full && !!pkg;
      if (usePkg) await tx.clientPackage.update({ where: { id: pkg!.id }, data: { creditsLeft: { decrement: 1 } } });

      await tx.booking.create({
        data: {
          tenantId: tenant.id,
          sessionId,
          clientId: client.id,
          status: full ? "WAITLIST" : "BOOKED",
          paymentMethod: full ? null : usePkg ? "package_credit" : "at_studio",
          clientPackageId: usePkg ? pkg!.id : null,
        },
      });
      return full ? "waitlist" : "booked";
    });
    return NextResponse.redirect(externalUrl(req, `${back}?ok=${result}`), 303);
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("Unique constraint");
    return NextResponse.redirect(externalUrl(req, `${back}?err=${dup ? "already" : "failed"}&s=${sessionId}`), 303);
  }
}
