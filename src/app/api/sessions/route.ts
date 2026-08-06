import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { utcFromZoned } from "@/lib/tz";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_schedule");
  if (__denied) return __denied;
  const session = await getSession();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const classTypeId = String(form.get("classTypeId") ?? "");
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : "/schedule";
  // Checkbox pattern: hidden "0" + checkbox "1" — absent entirely (old form) = public.
  const isPublic = form.has("isPublic") ? form.getAll("isPublic").includes("1") : true;

  const [tenant, classType] = await Promise.all([
    db.tenant.findUnique({ where: { id: session.tenantId } }),
    db.classType.findFirst({ where: { id: classTypeId, tenantId: session.tenantId } }),
  ]);
  if (!tenant || !classType || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.redirect(externalUrl(req, "/schedule/new?error=1"), 303);
  }

  const startsAt = utcFromZoned(date, time, tenant.timezone);
  const instructorId = String(form.get("instructorId") ?? "") || null;
  const repeatWeeks = Math.min(12, Math.max(1, Number(form.get("repeatWeeks") ?? 1) || 1));
  const capacity = Math.max(1, Number(form.get("capacity") ?? classType.capacity) || classType.capacity);
  const location = String(form.get("location") ?? "").trim() || null;

  await db.classSession.createMany({
    data: Array.from({ length: repeatWeeks }, (_, w) => {
      const s = new Date(startsAt.getTime() + w * 7 * 86400_000);
      return {
        tenantId: tenant.id,
        classTypeId: classType.id,
        instructorId,
        startsAt: s,
        endsAt: new Date(s.getTime() + classType.durationMin * 60_000),
        capacity,
        location,
        isPublic,
      };
    }),
  });
  return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}added=class`), 303);
}
