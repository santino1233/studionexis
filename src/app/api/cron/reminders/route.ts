import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { sendSms } from "@/lib/sms";
import { timeInTz } from "@/lib/tz";
import { publicSiteUrl } from "@/lib/site-url";

// Hit hourly by system cron with the shared secret. Emails clients whose
// class starts within the next 24h and hasn't been reminded yet.
export async function POST(req: Request) {
  if (new URL(req.url).searchParams.get("token") !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const due = await db.booking.findMany({
    where: {
      status: "BOOKED",
      remindedAt: null,
      client: { OR: [{ email: { not: null } }, { phone: { not: null } }] },
      session: { startsAt: { gt: new Date(), lt: new Date(Date.now() + 24 * 3600_000) }, status: "SCHEDULED" },
    },
    include: { client: true, session: { include: { classType: true } }, tenant: true },
    take: 200,
  });

  let sent = 0;
  for (const b of due) {
    if (!b.client.email && b.client.phone) {
      await sendSms({
        tenantId: b.tenantId,
        to: b.client.phone,
        kind: "reminder",
        body: `${b.tenant.name}: reminder — ${b.session.classType.name} ${b.session.startsAt.toLocaleDateString("en-US", { timeZone: b.tenant.timezone, weekday: "short", month: "short", day: "numeric" })} at ${timeInTz(b.session.startsAt, b.tenant.timezone)}.`,
      });
      await db.booking.update({ where: { id: b.id }, data: { remindedAt: new Date() } });
      sent++;
      continue;
    }
    await sendEmail({
      tenantId: b.tenantId,
      to: b.client.email!,
      subject: `Reminder: ${b.session.classType.name} at ${b.tenant.name}`,
      body: `Hi ${b.client.name},\n\nSee you at ${b.session.classType.name} — ${b.session.startsAt.toLocaleDateString("en-US", { timeZone: b.tenant.timezone, weekday: "long", month: "long", day: "numeric" })} at ${timeInTz(b.session.startsAt, b.tenant.timezone)}.\n\nNeed to change plans? Manage your booking: ${publicSiteUrl(b.tenant, "/bookings")}\n\n${b.tenant.name}`,
    });
    await db.booking.update({ where: { id: b.id }, data: { remindedAt: new Date() } });
    sent++;
  }
  return NextResponse.json({ ok: true, reminded: sent });
}
