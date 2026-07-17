import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { apiTenant, apiError, pageParams } from "@/lib/api-auth";
import { checkBookingLimit, checkClientLimit } from "@/lib/plans";

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const { url, limit, offset } = pageParams(req);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const where = { tenantId: a.tenant.id, ...(clientId ? { clientId } : {}) };
  const [total, bookings] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where, orderBy: { createdAt: "desc" }, take: limit, skip: offset,
      include: { client: { select: { name: true } }, session: { include: { classType: { select: { name: true } } } } },
    }),
  ]);
  return NextResponse.json({
    total, limit, offset,
    data: bookings.map((b) => ({
      id: b.id, status: b.status, seats: b.qty, paymentMethod: b.paymentMethod,
      client: { id: b.clientId, name: b.client.name },
      class: { id: b.sessionId, name: b.session.classType.name, startsAt: b.session.startsAt },
      createdAt: b.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  let body: { classId?: string; clientId?: string; name?: string; phone?: string; email?: string; seats?: number };
  try { body = await req.json(); } catch { return apiError(400, "bad_json", "Body must be JSON."); }
  const classId = String(body.classId ?? "");
  const seats = Math.min(5, Math.max(1, Number(body.seats) || 1));
  if (!classId) return apiError(422, "validation", "`classId` is required.");
  if (!body.clientId && !String(body.name ?? "").trim()) return apiError(422, "validation", "Send `clientId`, or `name` plus `phone`/`email` to create the client.");

  const limitCheck = await checkBookingLimit(a.tenant);
  if (!limitCheck.ok) return apiError(403, "plan_limit", "Booking limit reached for this plan.");

  try {
    const result = await db.$transaction(async (tx) => {
      const session = await tx.classSession.findFirstOrThrow({
        where: { id: classId, tenantId: a.tenant.id, status: "SCHEDULED", startsAt: { gt: new Date() } },
        include: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } }, select: { qty: true } } },
      });
      let client = body.clientId
        ? await tx.client.findFirst({ where: { id: String(body.clientId), tenantId: a.tenant.id } })
        : await tx.client.findFirst({
            where: { tenantId: a.tenant.id, OR: [...(body.phone ? [{ phone: String(body.phone) }] : []), ...(body.email ? [{ email: String(body.email).toLowerCase() }] : [])] },
          });
      if (!client) {
        if (body.clientId) throw new Error("client-not-found");
        const cl = await checkClientLimit(a.tenant);
        if (cl.ok !== true) throw new Error("plan-limit");
        client = await tx.client.create({
          data: { tenantId: a.tenant.id, name: String(body.name).trim(), phone: String(body.phone ?? "").trim() || null, email: String(body.email ?? "").trim().toLowerCase() || null, channel: "api" },
        });
      }
      const taken = session.bookings.reduce((n, b) => n + b.qty, 0);
      const spotsLeft = session.capacity - taken;
      const full = spotsLeft <= 0;
      if (!full && seats > spotsLeft) throw new Error("spots");

      let pkgId: string | null = null;
      let method: string | null = null;
      if (!full) {
        const pkg = await tx.clientPackage.findFirst({
          where: { tenantId: a.tenant.id, clientId: client.id, creditsLeft: { gte: seats }, frozen: false, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        });
        if (pkg) {
          await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: seats } } });
          pkgId = pkg.id;
          method = "package_credit";
        } else {
          method = "at_studio";
        }
      }
      const booking = await tx.booking.create({
        data: { tenantId: a.tenant.id, sessionId: classId, clientId: client.id, qty: full ? 1 : seats, status: full ? "WAITLIST" : "BOOKED", paymentMethod: method, clientPackageId: pkgId },
      });
      return { booking, client, waitlisted: full };
    });
    emitEvent(a.tenant.id, "booking.created", { bookingId: result.booking.id, clientName: result.client.name, className: "class", startsAt: "", seats: result.booking.qty, status: result.booking.status, source: "api" });
    return NextResponse.json({
      id: result.booking.id, status: result.booking.status, seats: result.booking.qty,
      paymentMethod: result.booking.paymentMethod, client: { id: result.client.id, name: result.client.name },
    }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) return apiError(409, "already_booked", "This client is already on that class.");
    if (msg === "spots") return apiError(409, "not_enough_spots", "Not enough spots left for that seat count.");
    if (msg === "client-not-found") return apiError(404, "not_found", "No client with that id.");
    if (msg === "plan-limit") return apiError(403, "plan_limit", "Client limit reached for this plan.");
    return apiError(404, "not_found", "No bookable class with that id.");
  }
}
