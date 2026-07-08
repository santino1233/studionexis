import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCheck, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { timeInTz, dayKeyInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  BOOKED: "bg-blue-wash text-blue",
  CHECKED_IN: "bg-green-wash text-green",
  WAITLIST: "bg-brand-wash text-brand",
  CANCELLED: "bg-line-2 text-muted",
  LATE_CANCEL: "bg-rose/10 text-rose",
  NO_SHOW: "bg-rose/10 text-rose",
};

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await db.classSession.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      classType: true,
      instructor: true,
      bookings: { include: { client: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!session) notFound();

  const active = session.bookings.filter((b) => b.status === "BOOKED" || b.status === "CHECKED_IN");
  const bookedIds = new Set(session.bookings.filter((b) => b.status !== "CANCELLED").map((b) => b.clientId));
  const [allClients, instructors] = await Promise.all([
    db.client.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" }, take: 200 }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "OWNER"] } }, orderBy: { name: "asc" } }),
  ]);
  const clients = allClients.filter((c) => !bookedIds.has(c.id));

  return (
    <div className="mx-auto max-w-[900px]">
      <Link href="/schedule" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to schedule
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="mt-1 size-4 rounded-full" style={{ background: session.classType.color }} />
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">{session.classType.name}</h1>
            <p className="mt-1 text-sm text-ink-2">
              {session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "long", month: "long", day: "numeric" })}
              {" · "}{timeInTz(session.startsAt, tenant.timezone)}–{timeInTz(session.endsAt, tenant.timezone)}
              {session.location ? ` · ${session.location}` : ""}{session.instructor ? ` · ${session.instructor.name}` : ""}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-line-2 bg-surface px-5 py-3 text-center shadow-[var(--shadow-card)]">
          <div className="font-display text-[22px] font-extrabold text-ink">{active.length}<span className="text-muted">/{session.capacity}</span></div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Booked</div>
        </div>
      </div>

      {error === "already" && (
        <div className="mb-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          That client is already on this class.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Roster" sub="Everyone on this class" />
          <table className="w-full text-left">
            <tbody>
              {session.bookings.map((b) => (
                <tr key={b.id} className="border-b border-line-2 last:border-0">
                  <td className="px-[18px] py-[13px]">
                    <Link href={`/clients/${b.clientId}`} className="text-[14px] font-semibold text-ink hover:text-brand">{b.client.name}</Link>
                    <div className="text-[11.5px] text-muted">{b.paymentMethod === "package_credit" ? "Package credit" : b.paymentMethod === "at_studio" ? "Pay at studio" : ""}</div>
                  </td>
                  <td className="px-[18px] py-[13px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[b.status] ?? "bg-line-2 text-ink-2"}`}>
                      {b.status.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-[18px] py-[13px]">
                    {(b.status === "BOOKED" || b.status === "WAITLIST" || b.status === "CHECKED_IN") && (
                      <div className="flex justify-end gap-1.5">
                        {b.status === "BOOKED" && (
                          <form method="post" action={`/api/bookings/${b.id}`}>
                            <input type="hidden" name="action" value="checkin" />
                            <button className="inline-flex items-center gap-1.5 rounded-lg bg-green-wash px-3 py-1.5 text-[12px] font-bold text-green hover:brightness-95"><UserCheck className="size-3.5" /> Check in</button>
                          </form>
                        )}
                        <form method="post" action={`/api/bookings/${b.id}`}>
                          <input type="hidden" name="action" value="cancel" />
                          <button className="inline-flex items-center gap-1.5 rounded-lg bg-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose"><X className="size-3.5" /> Cancel</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {session.bookings.length === 0 && (
                <tr><td className="px-[18px] py-12 text-center text-sm text-muted">Nobody booked yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-5">
        <Card>
          <CardHeader title="Book a client" sub={active.length >= session.capacity ? "Class is full — goes to waitlist" : "Uses a package credit when available"} />
          <form method="post" action="/api/bookings" className="space-y-3.5 p-5">
            <input type="hidden" name="sessionId" value={session.id} />
            <select name="clientId" required className="h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {clients.length === 0 ? (
              <p className="text-[12.5px] text-muted">Every client is already on this class.</p>
            ) : (
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
                {active.length >= session.capacity ? "Add to waitlist" : "Book them in"}
              </button>
            )}
          </form>
        </Card>

        {session.status === "SCHEDULED" && (
          <Card>
            <CardHeader title="Manage this class" />
            <form method="post" action={`/api/sessions/${session.id}`} className="space-y-3.5 p-5">
              <input type="hidden" name="action" value="update" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Date</label>
                  <input name="date" type="date" defaultValue={dayKeyInTz(session.startsAt, tenant.timezone)} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Start</label>
                  <input name="time" type="time" defaultValue={session.startsAt.toLocaleTimeString("en-GB", { timeZone: tenant.timezone, hour: "2-digit", minute: "2-digit", hour12: false })} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Minutes</label>
                  <input name="durationMin" type="number" min={10} defaultValue={Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60000)} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Spots</label>
                  <input name="capacity" type="number" min={1} defaultValue={session.capacity} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Room</label>
                  <input name="location" defaultValue={session.location ?? ""} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
                </div>
              </div>
              <select name="instructorId" defaultValue={session.instructorId ?? ""} className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand">
                <option value="">Unassigned</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input name="note" defaultValue={session.note ?? ""} placeholder="Override note (reason for changes)" className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
              <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <input type="checkbox" name="isPublic" defaultChecked={session.isPublic} className="size-4 accent-[#F97316]" />
                Visible on public booking page
              </label>
              <button className="w-full rounded-[10px] border border-line bg-surface py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Save changes</button>
            </form>
            <form method="post" action={`/api/sessions/${session.id}`} className="border-t border-line-2 p-5">
              <input type="hidden" name="action" value="cancel" />
              <button className="w-full rounded-[10px] bg-rose/10 py-2.5 text-sm font-bold text-rose hover:bg-rose/15">
                Cancel this class
              </button>
              <p className="mt-2 text-center text-[11.5px] text-muted">Everyone booked is cancelled and credits come back.</p>
            </form>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
