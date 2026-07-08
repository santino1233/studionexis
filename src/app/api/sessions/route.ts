import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { utcFromZoned } from "@/lib/tz";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const classTypeId = String(form.get("classTypeId") ?? "");
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");

  const [tenant, classType] = await Promise.all([
    db.tenant.findUnique({ where: { id: session.tenantId } }),
    db.classType.findFirst({ where: { id: classTypeId, tenantId: session.tenantId } }),
  ]);
  if (!tenant || !classType || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.redirect(externalUrl(req, "/schedule/new?error=1"), 303);
  }

  const startsAt = utcFromZoned(date, time, tenant.timezone);
  const endsAt = new Date(startsAt.getTime() + classType.durationMin * 60_000);
  const instructorId = String(form.get("instructorId") ?? "") || null;

  await db.classSession.create({
    data: {
      tenantId: tenant.id,
      classTypeId: classType.id,
      instructorId,
      startsAt,
      endsAt,
      capacity: Math.max(1, Number(form.get("capacity") ?? classType.capacity) || classType.capacity),
      location: String(form.get("location") ?? "").trim() || null,
    },
  });
  return NextResponse.redirect(externalUrl(req, "/schedule"), 303);
}
