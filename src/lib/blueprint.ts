import type { ClassType } from "@prisma/client";
import { db } from "@/lib/db";
import { utcFromZoned, dayKeyInTz } from "@/lib/tz";

export type RecurringSlot = { day: number; time: string; cap?: number }; // day: 0=Mon … 6=Sun

export function slotsOf(ct: Pick<ClassType, "recurringSlots">): RecurringSlot[] {
  const raw = ct.recurringSlots;
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (s): s is RecurringSlot =>
      !!s && typeof s === "object" &&
      Number.isInteger((s as RecurringSlot).day) &&
      typeof (s as RecurringSlot).time === "string" && /^\d{2}:\d{2}$/.test((s as RecurringSlot).time),
  );
}

const HORIZON_DAYS = 28;

/**
 * Create upcoming sessions from a blueprint's recurring slots, ~4 weeks ahead.
 * Idempotent: a session already existing at that classType+startsAt is skipped,
 * so editors and the daily cron can both call this freely.
 */
export async function materialiseClassType(classTypeId: string): Promise<number> {
  const ct = await db.classType.findUnique({ where: { id: classTypeId }, include: { tenant: true } });
  if (!ct || !ct.active) return 0;
  const slots = slotsOf(ct);
  if (slots.length === 0) return 0;

  const tz = ct.tenant.timezone;
  const validFrom = ct.validFrom ? ct.validFrom.toISOString().slice(0, 10) : null;
  const validTo = ct.validTo ? ct.validTo.toISOString().slice(0, 10) : null;
  const now = new Date();
  let created = 0;

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const dayKey = dayKeyInTz(new Date(now.getTime() + i * 86_400_000), tz); // YYYY-MM-DD in studio tz
    if (validFrom && dayKey < validFrom) continue;
    if (validTo && dayKey > validTo) continue;
    if (ct.exceptionDates.includes(dayKey)) continue;
    const weekday = (new Date(`${dayKey}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0

    for (const slot of slots) {
      if (slot.day !== weekday) continue;
      const startsAt = utcFromZoned(dayKey, slot.time, tz);
      if (startsAt <= now) continue;
      const exists = await db.classSession.findFirst({
        where: { tenantId: ct.tenantId, classTypeId: ct.id, startsAt },
        select: { id: true },
      });
      if (exists) continue;
      await db.classSession.create({
        data: {
          tenantId: ct.tenantId,
          classTypeId: ct.id,
          instructorId: ct.defaultInstructorId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + ct.durationMin * 60_000),
          capacity: slot.cap && slot.cap > 0 ? slot.cap : ct.capacity,
          isPublic: ct.publicByDefault,
        },
      });
      created++;
    }
  }
  return created;
}

export async function materialiseAll(): Promise<number> {
  const types = await db.classType.findMany({
    where: { active: true, NOT: { recurringSlots: { equals: [] } } },
    select: { id: true },
  });
  let total = 0;
  for (const t of types) total += await materialiseClassType(t.id);
  return total;
}
