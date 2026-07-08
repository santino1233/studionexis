import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, Plus, Pencil, Cake } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  const client = await db.client.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      packages: { include: { package: true }, orderBy: { createdAt: "desc" } },
      orders: true,
      bookings: {
        include: { session: { include: { classType: true, instructor: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!client) notFound();

  const fmt = moneyFormatter(tenant.currency);
  const ltv = client.orders.filter((o) => o.status === "PAID").reduce((s, o) => s + Number(o.total), 0);
  const activePkgs = client.packages.filter((p) => p.creditsLeft > 0 && p.expiresAt > new Date() && !p.frozen);
  const creditsLeft = activePkgs.reduce((s, p) => s + p.creditsLeft, 0);

  const stats: Array<[string, string]> = [
    ["Member since", client.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })],
    ["Lifetime value", fmt.format(ltv)],
    ["Credits left", creditsLeft ? String(creditsLeft) : "—"],
    ["Last visit", client.lastVisitAt ? client.lastVisitAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"],
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to clients
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-brand-wash text-2xl font-extrabold text-brand">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">{client.name}</h1>
              {client.tags.map((t) => (
                <span key={t} className="rounded-full bg-brand-wash px-2.5 py-1 text-[11px] font-bold text-brand">{t}</span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
              {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-muted" />{client.phone}</span>}
              {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-muted" />{client.email}</span>}
              {client.channel && <span className="inline-flex items-center gap-1.5 capitalize"><MessageCircle className="size-3.5 text-muted" />{client.channel}</span>}
              {client.birthday && <span className="inline-flex items-center gap-1.5"><Cake className="size-3.5 text-muted" />{client.birthday.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric" })}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
            <Plus className="size-4" /> Sell package
          </button>
          <Link href={`/clients/${client.id}/edit`} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">
            <Pencil className="size-4" /> Edit profile
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line-2 bg-surface px-[18px] py-4 shadow-[var(--shadow-card)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{l}</div>
            <div className="mt-1 font-display text-[20px] font-extrabold text-ink">{v}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Health & notes" sub="Private to your team" />
          <div className="p-5 text-[13.5px] text-ink-2">
            {client.medicalNotes || client.notes ? (
              <>
                {client.medicalNotes && <p className="mb-2"><span className="font-semibold text-ink">Health:</span> {client.medicalNotes}</p>}
                {client.notes && <p>{client.notes}</p>}
              </>
            ) : (
              <span className="text-muted">No notes on file.</span>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Active packages" sub="Credits, expiry and freeze status" />
          <div className="p-5">
            {activePkgs.length === 0 ? (
              <span className="text-[13.5px] text-muted">No active packages. Sell one via POS.</span>
            ) : (
              <ul className="space-y-3">
                {activePkgs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl border border-line-2 bg-raised px-4 py-3">
                    <div>
                      <div className="text-[14px] font-semibold text-ink">{p.package.name}</div>
                      <div className="text-[12px] text-muted">Expires {p.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div className="font-display text-lg font-extrabold text-brand">{p.creditsLeft}<span className="ml-1 text-[11px] font-bold text-muted">credits</span></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Session history */}
      <Card>
        <CardHeader title="Session history" sub="Most recent first" />
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Date", "Class", "Instructor", "Status"].map((h) => (
                <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {client.bookings.map((b) => (
              <tr key={b.id} className="border-b border-line-2 last:border-0">
                <td className="px-[18px] py-[14px] text-[13.5px] text-ink-2">{b.session.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-[18px] py-[14px] text-[13.5px] font-semibold text-ink">{b.session.classType.name}</td>
                <td className="px-[18px] py-[14px] text-[13.5px] text-ink-2">{b.session.instructor?.name ?? "—"}</td>
                <td className="px-[18px] py-[14px]">
                  <span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-2">{b.status.toLowerCase().replace("_", " ")}</span>
                </td>
              </tr>
            ))}
            {client.bookings.length === 0 && (
              <tr><td colSpan={4} className="px-[18px] py-12 text-center text-sm text-muted">No sessions yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
