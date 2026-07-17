import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PLANS, annualMonthly } from "@/lib/plans";
import { customFeatures, featureRequests } from "@/lib/features";
import { hqTagsOf } from "@/lib/hq";

export const dynamic = "force-dynamic";

const field = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand";
const statusTone: Record<string, string> = {
  TRIAL: "bg-brand-wash text-brand", ACTIVE: "bg-green-wash text-green",
  PAST_DUE: "bg-rose/10 text-rose", SUSPENDED: "bg-line-2 text-muted",
};

export default async function HqTenantPage({ params }: { params: Promise<{ secret: string; id: string }> }) {
  const { secret, id } = await params;
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN" || secret !== (process.env.HQ_PATH ?? "").replace(/^hq\//, "")) notFound();

  const d30 = new Date(Date.now() - 30 * 86400_000);
  const [tenant, clients, bookings30, revenue30, revenueAll, views7, recentOrders, staff, counts] = await Promise.all([
    db.tenant.findUnique({ where: { id } }),
    db.client.count({ where: { tenantId: id } }),
    db.booking.count({ where: { tenantId: id, createdAt: { gt: d30 } } }),
    db.order.aggregate({ where: { tenantId: id, status: "PAID", createdAt: { gt: d30 } }, _sum: { total: true } }),
    db.order.aggregate({ where: { tenantId: id, status: "PAID" }, _sum: { total: true } }),
    db.pageView.count({ where: { tenantId: id, createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } } }),
    db.order.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 8, include: { client: { select: { name: true } } } }),
    db.user.findMany({ where: { tenantId: id }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    Promise.all([
      db.classType.count({ where: { tenantId: id, active: true } }),
      db.package.count({ where: { tenantId: id, active: true } }),
      db.user.count({ where: { tenantId: id, role: { in: ["INSTRUCTOR", "STAFF", "MANAGER"] } } }),
      db.booking.count({ where: { tenantId: id } }),
      db.order.count({ where: { tenantId: id, status: "PAID" } }),
    ]),
  ]);
  if (!tenant) notFound();

  const siblings = tenant.organizationId
    ? await db.tenant.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, locationLabel: true, plan: true, status: true } })
    : [];
  const orgMrr = siblings.reduce((n, t) => n + (t.status === "ACTIVE" ? (PLANS.find((p) => p.id === t.plan)?.monthly ?? 0) : 0), 0);

  const pol = (tenant.policies ?? {}) as { billingCycle?: string };
  const plan = PLANS.find((p) => p.id === tenant.plan);
  const planMrr = plan ? (pol.billingCycle === "annual" ? annualMonthly(plan.monthly) : plan.monthly) : 0;
  const features = customFeatures(tenant);
  const featureMrr = features.filter((f) => f.active).reduce((n, f) => n + f.price, 0);
  const requests = featureRequests(tenant);
  const hqx = hqTagsOf(tenant);
  const onboarding: [string, boolean][] = [
    ["Signed up", true],
    ["Class types created", counts[0] > 0],
    ["Packages created", counts[1] > 0],
    ["Team invited", counts[2] > 0],
    ["First booking", counts[3] > 0],
    ["First payment", counts[4] > 0],
  ];
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: tenant.currency });
  const back = `/hq/${secret}/t/${id}`;

  const stat = (label: string, value: string, hint?: string) => (
    <div className="rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1.5 font-display text-[24px] font-extrabold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <Link href={`/hq/${secret}`} className="text-[12.5px] font-bold text-muted hover:text-ink">← Mission Control</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">{tenant.name}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[tenant.status]}`}>{tenant.status.toLowerCase().replace("_", " ")}</span>
          <span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-2">{tenant.plan}{pol.billingCycle === "annual" ? " · annual" : ""}</span>
          <a href={`https://${tenant.slug}.nexis.revsports.ca`} target="_blank" className="text-[12.5px] font-bold text-brand hover:underline">{tenant.slug}.nexis.revsports.ca ↗</a>
          {hqx.tags?.map((tg) => <span key={tg} className="rounded-full bg-purple-wash px-2.5 py-1 text-[10.5px] font-bold text-purple">{tg}</span>)}
          <form method="post" action={`/api/hq/${tenant.id}`} className="ml-auto">
            <input type="hidden" name="action" value="impersonate" />
            <button className="rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-canvas hover:opacity-90">🎭 Log in as owner</button>
          </form>
        </div>
        {siblings.length > 1 && (
          <div className="mt-3 rounded-xl border border-purple/20 bg-purple-wash/40 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className="font-bold text-purple">🏢 Franchise · {siblings.length} locations</span>
              <span className="text-muted">·</span>
              <span className="font-bold text-ink">${orgMrr}/mo combined</span>
              <span className="text-muted">·</span>
              {siblings.map((s) => (
                <a key={s.id} href={`/hq/${secret}/t/${s.id}`} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.id === tenant.id ? "bg-purple text-white" : "bg-surface text-ink-2 hover:text-ink"}`}>{s.locationLabel || s.name}</a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {stat("MRR to us", fmt.format(planMrr + featureMrr), featureMrr > 0 ? `plan ${fmt.format(planMrr)} + features ${fmt.format(featureMrr)}` : "subscription")}
          {stat("Their revenue · 30d", money.format(Number(revenue30._sum.total ?? 0)), `all-time ${money.format(Number(revenueAll._sum.total ?? 0))}`)}
          {stat("Bookings · 30d", String(bookings30))}
          {stat("Clients", String(clients))}
          {stat("Site views · 7d", String(views7))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader title="Subscription" sub="Plan, trial and account controls" />
              <div className="space-y-3 p-5">
                <form method="post" action={`/api/hq/${tenant.id}`} className="flex gap-2">
                  <input type="hidden" name="action" value="plan" />
                  <input type="hidden" name="back" value={back} />
                  <select name="plan" defaultValue={tenant.plan} className={`${field} flex-1`}>
                    {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — ${p.monthly}/mo</option>)}
                  </select>
                  <button className="rounded-[10px] bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-ink">Set plan</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="extend" /><input type="hidden" name="back" value={back} /><button className="rounded-lg bg-brand-wash px-3 py-2 text-[12px] font-bold text-brand">+7d trial</button></form>
                  <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="activate" /><input type="hidden" name="back" value={back} /><button className="rounded-lg bg-green-wash px-3 py-2 text-[12px] font-bold text-green">Mark paid / active</button></form>
                  {tenant.status !== "SUSPENDED" ? (
                    <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="suspend" /><input type="hidden" name="back" value={back} /><button className="rounded-lg bg-rose/10 px-3 py-2 text-[12px] font-bold text-rose">Suspend</button></form>
                  ) : (
                    <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="reactivate" /><input type="hidden" name="back" value={back} /><button className="rounded-lg bg-line-2 px-3 py-2 text-[12px] font-bold text-ink-2">Restore</button></form>
                  )}
                </div>
                {tenant.trialEndsAt && <p className="text-[12px] text-muted">Trial ends {tenant.trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Onboarding & internal notes" sub="Progress + notes only HQ can see" />
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-1.5">
                  {onboarding.map(([label, ok]) => (
                    <span key={label} className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold ${ok ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{ok ? "✓" : "○"} {label}</span>
                  ))}
                </div>
                <form method="post" action={`/api/hq/${tenant.id}`} className="space-y-2 border-t border-line-2 pt-3">
                  <input type="hidden" name="action" value="hqtags" />
                  <input type="hidden" name="back" value={back} />
                  <input name="tags" defaultValue={hqx.tags?.join(", ") ?? ""} placeholder="Tags: VIP, churn-risk…" className={field} />
                  <textarea name="notes" rows={3} defaultValue={hqx.notes ?? ""} placeholder="Internal notes…" className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
                  <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2"><input type="checkbox" name="comp" defaultChecked={hqx.comp ?? false} className="size-4 accent-[#F97316]" /> Complimentary account (never bill)</label>
                  <button className="rounded-[10px] bg-line-2 px-4 py-2 text-[12px] font-bold text-ink-2 hover:text-ink">Save</button>
                </form>
              </div>
            </Card>

            <Card>
              <CardHeader title="Staff" sub="Reset any password — audit logged" />
              <ul className="divide-y divide-line-2">
                {staff.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-[12.5px]">
                    <span className="min-w-0"><b className="text-ink">{u.name}</b> <span className="text-muted">· {u.role.toLowerCase()} · {u.email}</span></span>
                    <form method="post" action={`/api/hq/${tenant.id}`} className="flex shrink-0 gap-1.5">
                      <input type="hidden" name="action" value="staffpw" />
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="back" value={back} />
                      <input name="password" placeholder="New pw (8+)" className="h-8 w-[110px] rounded-lg border border-line bg-surface px-2 text-[11.5px] outline-none focus:border-brand" />
                      <button className="rounded-lg bg-line-2 px-2 py-1 text-[10.5px] font-bold text-ink-2 hover:text-ink">Set</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Recent orders" sub="Their sales, newest first" />
              <ul className="divide-y divide-line-2">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
                    <span className="text-ink-2">#{o.number} · {o.client?.name ?? "—"} · <span className="capitalize">{o.method}</span></span>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === "PAID" ? "bg-green-wash text-green" : "bg-brand-wash text-brand"}`}>{o.status}</span>
                      <b className="text-ink">{money.format(Number(o.total))}</b>
                    </span>
                  </li>
                ))}
                {recentOrders.length === 0 && <li className="px-5 py-6 text-center text-[12.5px] text-muted">No orders yet.</li>}
              </ul>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Custom features" sub="Billed monthly on top of their plan — theirs alone" />
              <div className="space-y-3 p-5">
                {features.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-line-2 px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-ink">{f.label}</span>
                      <span className="text-[11px] text-muted">{f.id} · ${f.price}/mo</span>
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="feature-toggle" /><input type="hidden" name="fid" value={f.id} /><input type="hidden" name="back" value={back} /><button className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${f.active ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{f.active ? "Active" : "Paused"}</button></form>
                      <form method="post" action={`/api/hq/${tenant.id}`}><input type="hidden" name="action" value="feature-remove" /><input type="hidden" name="fid" value={f.id} /><input type="hidden" name="back" value={back} /><button className="rounded-lg bg-line-2 px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">✕</button></form>
                    </span>
                  </div>
                ))}
                <form method="post" action={`/api/hq/${tenant.id}`} className="flex gap-2 border-t border-line-2 pt-3">
                  <input type="hidden" name="action" value="feature-add" />
                  <input type="hidden" name="back" value={back} />
                  <input name="label" required placeholder="Feature name" className={`${field} min-w-0 flex-1`} />
                  <input name="price" type="number" min={0} step="0.01" placeholder="$/mo" className={`${field} w-24`} />
                  <button className="rounded-[10px] bg-ink px-4 text-[13px] font-bold text-canvas hover:opacity-90">Grant</button>
                </form>
              </div>
            </Card>

            <Card>
              <CardHeader title="Feature requests" sub="What this studio asked for" />
              <ul className="divide-y divide-line-2">
                {requests.map((r, idx) => (
                  <li key={idx} className="space-y-2 px-5 py-3.5">
                    <p className="text-[13px] leading-relaxed text-ink">{r.text}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted">{new Date(r.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <form method="post" action={`/api/hq/${tenant.id}`} className="flex gap-1.5">
                        <input type="hidden" name="action" value="request-status" />
                        <input type="hidden" name="idx" value={idx} />
                        <input type="hidden" name="back" value={back} />
                        <select name="status" defaultValue={r.status} className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] outline-none">
                          {["NEW", "REVIEWING", "DONE", "DECLINED"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <button className="rounded-lg bg-line-2 px-2.5 text-[11px] font-bold text-ink-2 hover:text-ink">Set</button>
                      </form>
                    </div>
                  </li>
                ))}
                {requests.length === 0 && <li className="px-5 py-6 text-center text-[12.5px] text-muted">No requests.</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
