import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { timeInTz } from "@/lib/tz";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  SCHEDULED: "bg-blue-wash text-blue",
  COMPLETED: "bg-green-wash text-green",
  CANCELLED: "bg-line-2 text-muted",
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const past = show === "past";
  const tenant = await getCurrentTenant();
  const sessions = await db.classSession.findMany({
    where: {
      tenantId: tenant.id,
      startsAt: past ? { lt: new Date() } : { gte: new Date(Date.now() - 3600_000) },
    },
    include: {
      classType: true,
      instructor: true,
      _count: { select: { bookings: { where: { status: { in: ["BOOKED", "CHECKED_IN"] } } } } },
    },
    orderBy: { startsAt: past ? "desc" : "asc" },
    take: 100,
  });

  const tabBase = "rounded-xl px-4 py-2 text-sm font-semibold transition-colors";
  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Classes</h1>
          <p className="mt-1 text-sm text-muted">Every class session — upcoming and history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/classes" className={`${tabBase} ${!past ? "bg-brand-wash text-brand" : "border border-line-2 bg-surface text-ink-2 hover:bg-raised"}`}>Upcoming</Link>
          <Link href="/classes?show=past" className={`${tabBase} ${past ? "bg-brand-wash text-brand" : "border border-line-2 bg-surface text-ink-2 hover:bg-raised"}`}>Past</Link>
          <Link href="/schedule/new" className="ml-2 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
            <Plus className="size-4" /> Add class
          </Link>
        </div>
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Class", "When", "Instructor", "Booked", "Status"].map((h) => (
                <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[18px] py-[14px]">
                  <Link href={`/schedule/${s.id}`} className="inline-flex items-center gap-2.5 text-[14px] font-semibold text-ink hover:text-brand">
                    <span className="size-3 rounded-full" style={{ background: s.classType.color }} />
                    {s.classType.name}
                  </Link>
                </td>
                <td className="px-[18px] py-[14px] text-[13.5px] text-ink-2">
                  {s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} · {timeInTz(s.startsAt, tenant.timezone)}
                </td>
                <td className="px-[18px] py-[14px] text-[13.5px] text-ink-2">{s.instructor?.name ?? "—"}</td>
                <td className="px-[18px] py-[14px] text-[13.5px] font-semibold text-ink">{s._count.bookings}/{s.capacity}</td>
                <td className="px-[18px] py-[14px]">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[s.status] ?? "bg-line-2 text-ink-2"}`}>{s.status.toLowerCase()}</span>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={5} className="px-[18px] py-12 text-center text-sm text-muted">{past ? "No past classes yet." : "Nothing scheduled — add your first class."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
