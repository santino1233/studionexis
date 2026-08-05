// Structured weekly operating hours, persisted on `tenant.policies.hours`.
//
//   policies.hours = {
//     mon: { open: "07:00", close: "21:00", closed: false },
//     ...through sun
//   }
//
// This is a plain server-safe module (no "use server", no client-only imports)
// so it can be used from server components, the settings route, and the
// schedule calendar alike. When `policies.hours` is unset the readers return
// null and every caller keeps its previous hard-coded behaviour — nothing about
// existing tenants changes until they save hours in Settings.

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type DayHours = { open: string; close: string; closed: boolean };
export type WeekHours = Record<WeekdayKey, DayHours>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True for a valid "HH:MM" 24h string. */
export function isTime(s: unknown): s is string {
  return typeof s === "string" && TIME_RE.test(s);
}

/** Minutes since midnight for an "HH:MM" string (0 on malformed input). */
export function toMin(t: string): number {
  if (!isTime(t)) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Sensible default for a single day when hours are being configured. */
export const DEFAULT_DAY: DayHours = { open: "07:00", close: "21:00", closed: false };

/** A fully-open default week — used to seed the editor when hours are unset. */
export function defaultWeek(): WeekHours {
  return WEEKDAY_KEYS.reduce((acc, k) => {
    acc[k] = { ...DEFAULT_DAY };
    return acc;
  }, {} as WeekHours);
}

/**
 * Read normalised weekly hours from a tenant's `policies`, or null when hours
 * have never been configured. A malformed/partial blob is repaired field by
 * field so a bad value can never crash a calendar render.
 */
export function hoursOf(policies: unknown): WeekHours | null {
  const raw = (policies as { hours?: unknown } | null | undefined)?.hours;
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const out = {} as WeekHours;
  let any = false;
  for (const k of WEEKDAY_KEYS) {
    const d = src[k] as Partial<DayHours> | undefined;
    if (d && typeof d === "object") {
      out[k] = {
        open: isTime(d.open) ? d.open : DEFAULT_DAY.open,
        close: isTime(d.close) ? d.close : DEFAULT_DAY.close,
        closed: !!d.closed,
      };
      any = true;
    } else {
      out[k] = { ...DEFAULT_DAY };
    }
  }
  return any ? out : null;
}

/** Weekday key for a "YYYY-MM-DD" calendar date (timezone-independent). */
export function weekdayKeyOf(dateStr: string): WeekdayKey {
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  return WEEKDAY_KEYS[(dow + 6) % 7]; // shift so Monday = 0
}

/**
 * Widest [minH, maxH] hour window across all OPEN days (hours, floored/ceiled).
 * Returns null when hours are unset or every day is closed, so callers fall
 * back to their own defaults.
 */
export function openHourRange(hours: WeekHours | null): { minH: number; maxH: number } | null {
  if (!hours) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const k of WEEKDAY_KEYS) {
    const d = hours[k];
    if (d.closed) continue;
    lo = Math.min(lo, Math.floor(toMin(d.open) / 60));
    hi = Math.max(hi, Math.ceil(toMin(d.close) / 60));
  }
  if (lo === Infinity || hi <= lo) return null;
  return { minH: lo, maxH: hi };
}
