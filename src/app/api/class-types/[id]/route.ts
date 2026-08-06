import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { materialiseClassType, slotsOf, type RecurringSlot } from "@/lib/blueprint";
import { classFormats, isValidDifficulty } from "@/lib/class-config";
import { guardCap } from "@/lib/rbac-server";

function csv(v: FormDataEntryValue | null): string[] {
  return String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const __denied = await guardCap(req, "manage_class_types");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const section = String(form.get("section") ?? "");
  const ct = await db.classType.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!ct) return NextResponse.redirect(externalUrl(req, "/class-types"), 303);

  const back = (tab: string, extra = "") => externalUrl(req, `/class-types/${id}?tab=${tab}&saved=1${extra}`);

  if (section === "general") {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return NextResponse.redirect(externalUrl(req, `/class-types/${id}?error=name`), 303);
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
    const format = String(form.get("format") ?? "");
    await db.classType.update({
      where: { id },
      data: {
        name,
        description: String(form.get("description") ?? "").trim() || null,
        kind: form.get("kind") === "PRIVATE" ? "PRIVATE" : "GROUP",
        format: format && (classFormats(tenant).includes(format) || format === ct.format) ? format : null,
        difficulty: isValidDifficulty(tenant, String(form.get("difficulty"))) ? String(form.get("difficulty")) : ct.difficulty,
        color: String(form.get("color") ?? ct.color),
        durationMin: Math.max(10, Number(form.get("durationMin")) || ct.durationMin),
        capacity: Math.max(1, Number(form.get("capacity")) || ct.capacity),
        benefits: csv(form.get("benefits")),
        goodFor: csv(form.get("goodFor")),
        tags: csv(form.get("tags")),
        equipment: csv(form.get("equipment")),
      },
    });
    return NextResponse.redirect(back("general"), 303);
  }

  if (section === "muscles") {
    await db.classType.update({ where: { id }, data: { muscles: csv(form.get("muscles")) } });
    return NextResponse.redirect(back("general"), 303);
  }

  if (section === "pricing") {
    const price = Number(form.get("price"));
    await db.classType.update({ where: { id }, data: { price: (Number.isFinite(price) && price >= 0 ? price : Number(ct.price)).toFixed(2) } });
    return NextResponse.redirect(back("pricing"), 303);
  }

  if (section === "schedule") {
    const instructorId = String(form.get("defaultInstructorId") ?? "");
    const instructor = instructorId
      ? await db.user.findFirst({ where: { id: instructorId, tenantId: auth.tenantId, active: true } })
      : null;
    const vf = String(form.get("validFrom") ?? "");
    const vt = String(form.get("validTo") ?? "");
    await db.classType.update({
      where: { id },
      data: {
        defaultInstructorId: instructor?.id ?? null,
        publicByDefault: form.get("publicByDefault") === "on",
        validFrom: /^\d{4}-\d{2}-\d{2}$/.test(vf) ? new Date(`${vf}T00:00:00Z`) : null,
        validTo: /^\d{4}-\d{2}-\d{2}$/.test(vt) ? new Date(`${vt}T00:00:00Z`) : null,
      },
    });
    const made = await materialiseClassType(id);
    return NextResponse.redirect(back("schedule", made ? `&made=${made}` : ""), 303);
  }

  if (section === "slot-add") {
    const day = Number(form.get("day"));
    const time = String(form.get("time") ?? "");
    const cap = Number(form.get("cap"));
    if (!Number.isInteger(day) || day < 0 || day > 6 || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.redirect(externalUrl(req, `/class-types/${id}?tab=schedule&error=slot`), 303);
    }
    const slots = slotsOf(ct);
    if (!slots.some((s) => s.day === day && s.time === time)) {
      const slot: RecurringSlot = { day, time, ...(Number.isFinite(cap) && cap > 0 ? { cap } : {}) };
      await db.classType.update({ where: { id }, data: { recurringSlots: [...slots, slot] as unknown as Prisma.InputJsonValue } });
    }
    const made = await materialiseClassType(id);
    return NextResponse.redirect(back("schedule", made ? `&made=${made}` : ""), 303);
  }

  if (section === "slot-remove") {
    const idx = Number(form.get("idx"));
    const slots = slotsOf(ct).filter((_, i) => i !== idx);
    await db.classType.update({ where: { id }, data: { recurringSlots: slots as unknown as Prisma.InputJsonValue } });
    return NextResponse.redirect(back("schedule"), 303);
  }

  if (section === "exception-add" || section === "exception-remove") {
    const date = String(form.get("date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.redirect(externalUrl(req, `/class-types/${id}?tab=schedule`), 303);
    const dates = section === "exception-add"
      ? [...new Set([...ct.exceptionDates, date])].sort()
      : ct.exceptionDates.filter((d) => d !== date);
    await db.classType.update({ where: { id }, data: { exceptionDates: dates } });
    return NextResponse.redirect(back("schedule"), 303);
  }

  if (section === "archive" || section === "restore") {
    await db.classType.update({ where: { id }, data: { active: section === "restore" } });
    return NextResponse.redirect(externalUrl(req, section === "archive" ? "/class-types" : `/class-types/${id}?saved=1`), 303);
  }

  return NextResponse.redirect(externalUrl(req, `/class-types/${id}`), 303);
}
