import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { utcFromZoned } from "@/lib/tz";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_schedule");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : "/schedule";

  const date = String(form.get("date") ?? "");
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
    return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}blockerr=1`), 303);
  }
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const startsAt = utcFromZoned(date, from, tenant.timezone);
  const endsAt = utcFromZoned(date, to, tenant.timezone);
  if (endsAt <= startsAt) {
    return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}blockerr=1`), 303);
  }
  await db.timeBlock.create({
    data: { tenantId: tenant.id, startsAt, endsAt, reason: String(form.get("reason") ?? "").trim() || null },
  });
  return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}added=block`), 303);
}
