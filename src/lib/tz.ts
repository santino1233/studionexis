// Store UTC, display/enter in the studio's timezone.

// Interpret "YYYY-MM-DD" + "HH:MM" as wall-clock time in tz → UTC Date.
export function utcFromZoned(dateStr: string, timeStr: string, tz: string): Date {
  const pretendUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const asTz = new Date(pretendUtc.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(pretendUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(pretendUtc.getTime() + (asUtc.getTime() - asTz.getTime()));
}

// "YYYY-MM-DD" of an instant as seen in tz.
export function dayKeyInTz(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

export function timeInTz(d: Date, tz: string): string {
  return d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
}

// Monday-start week (as tz day keys) containing now + offset weeks.
export function weekDays(tz: string, offsetWeeks: number): string[] {
  const now = new Date(Date.now() + offsetWeeks * 7 * 86400_000);
  const todayKey = dayKeyInTz(now, tz);
  const dow = (new Date(`${todayKey}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0
  const monday = new Date(new Date(`${todayKey}T00:00:00Z`).getTime() - dow * 86400_000);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86400_000).toISOString().slice(0, 10),
  );
}
