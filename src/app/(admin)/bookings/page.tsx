import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { timeInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  BOOKED: "bg-blue-wash text-blue",
  CHECKED_IN: "bg-green-wash text-green",
  WAITLIST: "bg-brand-wash text-brand",
  CANCELLED: "bg-line-2 text-muted",
  LATE_CANCEL: "bg-rose/10 text-rose",
  NO_SHOW: "bg-rose/10 text-rose",
};

export default async function BookingsPage() {
  const tenant = await getCurrentTenant();
  const bookings = await db.booking.findMany({
    where: { tenantId: tenant.id },
    include: { client: true, session: { include: { classType: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Bookings</h1>
      <p className="mt-1 text-sm text-muted">The latest reservations across every class.</p>

      <Card className="mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Client", "Class", "When", "Payment", "Status"].map((h) => (
                <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[18px] py-[14px]">
                  <Link href={`/clients/${b.clientId}`} className="text-[14px] font-semibold text-ink hover:text-brand">{b.client.name}</Link>
                </td>
                <td className="px-[18px] py-[14px]">
                  <Link href={`/schedule/${b.sessionId}`} className="inline-flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand">
                    <span className="size-2.5 rounded-full" style={{ background: b.session.classType.color }} />
                    {b.session.classType.name}
                  </Link>
                </td>
                <td className="px-[18px] py-[14px] text-[13.5px] text-ink-2">
                  {b.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric" })} · {timeInTz(b.session.startsAt, tenant.timezone)}
                </td>
                <td className="px-[18px] py-[14px] text-[13px] text-ink-2">
                  {b.paymentMethod === "package_credit" ? "Package credit" : b.paymentMethod === "at_studio" ? "Pay at studio" : "—"}
                </td>
                <td className="px-[18px] py-[14px]">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[b.status] ?? "bg-line-2 text-ink-2"}`}>
                    {b.status.toLowerCase().replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={5} className="px-[18px] py-12 text-center text-sm text-muted">No bookings yet — open a class on the schedule and book someone in.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
