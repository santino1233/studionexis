import { notFound } from "next/navigation";
import { Building2, Timer, DollarSign, Users } from "lucide-react";
import { Kpi } from "@/components/ui/kpi";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  TRIAL: "bg-brand-wash text-brand",
  ACTIVE: "bg-green-wash text-green",
  PAST_DUE: "bg-rose/10 text-rose",
  SUSPENDED: "bg-line-2 text-muted",
};

export default async function HqPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN" || secret !== (process.env.HQ_PATH ?? "").replace(/^hq\//, "")) notFound();

  const pendingTopups = await db.smsTopup.findMany({
    where: { status: "PENDING" },
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  const [tenants, revenueAgg, clientTotal] = await Promise.all([
    db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clients: true, users: true, orders: true } } },
    }),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    db.client.count(),
  ]);
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const trials = tenants.filter((t) => t.status === "TRIAL").length;

  return (
    <div className="min-h-screen bg-canvas px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-1 font-display text-[13px] font-extrabold uppercase tracking-[0.15em] text-brand">Mission Control</div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Studio Nexis HQ</h1>
        <p className="mt-1 text-sm text-muted">Every studio on the platform. This address is secret — don&apos;t share it.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Building2} tone="o" label="Studios" value={String(tenants.length)} />
          <Kpi icon={Timer} tone="p" label="On trial" value={String(trials)} />
          <Kpi icon={DollarSign} tone="g" label="GMV (all studios)" value={fmt.format(Number(revenueAgg._sum.total ?? 0))} />
          <Kpi icon={Users} tone="b" label="End clients" value={String(clientTotal)} />
        </div>

        {pendingTopups.length > 0 && (
          <Card className="mt-6">
            <CardHeader title="SMS top-ups awaiting payment" sub="Confirm once the studio has paid — credits apply instantly" />
            <ul className="divide-y divide-line-2">
              {pendingTopups.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13.5px] text-ink-2"><b className="text-ink">{t.tenant.name}</b> · ${Number(t.amount).toFixed(2)} · {t.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <form method="post" action={`/api/hq/topups/${t.id}`}>
                    <button className="rounded-lg bg-green-wash px-3 py-1.5 text-[11.5px] font-bold text-green hover:brightness-95">Mark paid</button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader title="Studios" sub="Plans, trials and controls" />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Studio", "Status", "Trial ends", "Clients", "Team", "Orders", "Actions"].map((h) => (
                  <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[14px]">
                    <div className="text-[14px] font-semibold text-ink">{t.name}</div>
                    <div className="text-[11.5px] text-muted">/{t.slug} · {t.currency}</div>
                  </td>
                  <td className="px-[18px] py-[14px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[t.status]}`}>{t.status.toLowerCase().replace("_", " ")}</span>
                  </td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">
                    {t.trialEndsAt ? t.trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{t._count.clients}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{t._count.users}</td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{t._count.orders}</td>
                  <td className="px-[18px] py-[14px]">
                    <div className="flex gap-1.5">
                      <form method="post" action={`/api/hq/${t.id}`}><input type="hidden" name="action" value="extend" /><button className="rounded-lg bg-brand-wash px-2.5 py-1.5 text-[11.5px] font-bold text-brand hover:brightness-95">+7d</button></form>
                      <form method="post" action={`/api/hq/${t.id}`}><input type="hidden" name="action" value="activate" /><button className="rounded-lg bg-green-wash px-2.5 py-1.5 text-[11.5px] font-bold text-green hover:brightness-95">Paid</button></form>
                      {t.status !== "SUSPENDED" ? (
                        <form method="post" action={`/api/hq/${t.id}`}><input type="hidden" name="action" value="suspend" /><button className="rounded-lg bg-rose/10 px-2.5 py-1.5 text-[11.5px] font-bold text-rose hover:brightness-95">Suspend</button></form>
                      ) : (
                        <form method="post" action={`/api/hq/${t.id}`}><input type="hidden" name="action" value="reactivate" /><button className="rounded-lg bg-line-2 px-2.5 py-1.5 text-[11.5px] font-bold text-ink-2 hover:brightness-95">Restore</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
