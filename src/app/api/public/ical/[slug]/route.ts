import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { appsOf } from "@/lib/webhooks";

// Read-only iCal feed of upcoming public classes (Wave 15 A3) —
// subscribe from Google/Apple/Outlook calendars.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const tenant = await tenantBySlugOrDomain(slug);
  const apps = tenant ? appsOf(tenant.policies) : {};
  if (!tenant || !apps.icalToken || token !== apps.icalToken) {
    return new Response("Not found", { status: 404 });
  }
  const sessions = await db.classSession.findMany({
    where: { tenantId: tenant.id, status: "SCHEDULED", isPublic: true, startsAt: { gt: new Date(), lt: new Date(Date.now() + 60 * 86400_000) } },
    include: { classType: { select: { name: true } }, instructor: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
    take: 300,
  });
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//StudioNexis//${tenant.slug}//EN`,
    `X-WR-CALNAME:${tenant.name} — Classes`,
    ...sessions.flatMap((s) => [
      "BEGIN:VEVENT",
      `UID:${s.id}@nexis`,
      `DTSTART:${dt(s.startsAt)}`,
      `DTEND:${dt(s.endsAt)}`,
      `SUMMARY:${s.classType.name}${s.instructor ? ` — ${s.instructor.name}` : ""}`,
      ...(s.location ? [`LOCATION:${s.location}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
