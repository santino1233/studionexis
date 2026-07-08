import Link from "next/link";
import { Check, MessageSquareText, Globe } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { PLANS, ADDONS, ANNUAL_DISCOUNT, annualMonthly, getLimits, planUsage, getPlan } from "@/lib/plans";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const hot = limit ? used / limit >= 0.85 : false;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="font-semibold text-ink-2">{label}</span>
        <span className={`font-bold ${hot ? "text-brand" : "text-ink"}`}>{used.toLocaleString()}{limit ? ` / ${limit.toLocaleString()}` : " · unlimited"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line-2">
        <div className={`h-full rounded-full ${hot ? "bg-brand" : "bg-green"}`} style={{ width: limit ? `${pct}%` : "100%", opacity: limit ? 1 : 0.25 }} />
      </div>
    </div>
  );
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ saved?: string; cycle?: string; sms?: string }> }) {
  const { saved, cycle: cycleParam, sms } = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await getSession();
  const isOwner = session?.role === "OWNER";
  const pol = (tenant.policies ?? {}) as { billingCycle?: string };
  const cycle = cycleParam === "annual" || (!cycleParam && pol.billingCycle === "annual") ? "annual" : "monthly";
  const limits = getLimits(tenant);
  const usage = await planUsage(tenant);
  const trialDays = tenant.trialEndsAt ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86400_000)) : null;

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const smsPlan = getPlan(tenant.plan).sms;
  const [smsMonth, smsRecent, smsPendingTopups] = await Promise.all([
    db.smsMessage.aggregate({ where: { tenantId: tenant.id, createdAt: { gte: monthStart }, status: { notIn: ["SKIPPED_PLAN", "SKIPPED_NO_CREDITS", "SKIPPED_NO_TWILIO", "FAILED"] } }, _sum: { estCharge: true }, _count: true }),
    db.smsMessage.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.smsTopup.findMany({ where: { tenantId: tenant.id, status: "PENDING" } }),
  ]);
  const smsBalance = Number(tenant.smsBalance);

  const statusLine =
    tenant.status === "TRIAL" ? `Free trial — ${trialDays} day${trialDays === 1 ? "" : "s"} left` :
    tenant.status === "ACTIVE" ? "Active subscription" :
    tenant.status === "PAST_DUE" ? "Payment issue — please contact us" : "Suspended";

  return (
    <div className="mx-auto max-w-[1050px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Plan &amp; Billing</h1>
      <p className="mt-1 text-sm text-muted">StudioNexis Beta pricing · {statusLine}</p>

      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-bold text-green">Plan saved. Online card billing launches soon — until then your plan is activated by our team.</div>}

      {/* Usage */}
      <Card className="mt-6">
        <CardHeader eyebrow="This month" title="Your usage" sub={`On the ${tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} plan`} />
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-3">
          <Meter label="Active clients" used={usage.clients} limit={limits.clients} />
          <Meter label="Team members" used={usage.staff} limit={limits.staff} />
          <Meter label="Bookings this month" used={usage.bookings} limit={limits.bookingsPerMonth} />
        </div>
      </Card>

      {/* Cycle toggle */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <Link href="/billing?cycle=monthly" className={`rounded-full px-5 py-2 text-[13px] font-bold ${cycle === "monthly" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>Monthly</Link>
        <Link href="/billing?cycle=annual" className={`rounded-full px-5 py-2 text-[13px] font-bold ${cycle === "annual" ? "bg-ink text-canvas" : "bg-line-2 text-ink-2"}`}>
          Annual <span className="ml-1 rounded-full bg-green-wash px-2 py-0.5 text-[10.5px] text-green">save {ANNUAL_DISCOUNT * 100}%</span>
        </Link>
      </div>

      {/* Plans */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((p, i) => {
          const current = tenant.plan === p.id;
          const price = cycle === "annual" ? annualMonthly(p.monthly) : p.monthly;
          const popular = i === 1;
          return (
            <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-surface shadow-[var(--shadow-card)] ${current ? "border-brand ring-2 ring-brand/25" : popular ? "border-brand/40" : "border-line-2"}`}>
              {popular && !current && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Most popular</span>}
              {current && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-canvas">Your plan</span>}
              <div className="flex-1 p-6">
                <h2 className="font-display text-[19px] font-extrabold text-ink">{p.name}</h2>
                <p className="mt-1 text-[12.5px] text-muted">{p.blurb}</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-[36px] font-extrabold tracking-tight text-ink">${price}</span>
                  <span className="text-[13px] text-muted">/ month</span>
                </div>
                {cycle === "annual" && <div className="text-[11.5px] text-muted">billed annually (${Math.round(price * 12)}/yr) · <s>${p.monthly}/mo</s></div>}
                <ul className="mt-5 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-[13px] ${f.startsWith("Everything") ? "font-bold text-ink" : "text-ink-2"}`}>
                      <Check className="mt-0.5 size-4 shrink-0 text-green" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                {isOwner ? (
                  current ? (
                    <div className="rounded-xl border border-line-2 bg-raised py-3 text-center text-[13.5px] font-bold text-muted">Current plan</div>
                  ) : (
                    <form method="post" action="/api/billing">
                      <input type="hidden" name="plan" value={p.id} />
                      <input type="hidden" name="cycle" value={cycle} />
                      <button className={`w-full rounded-xl py-3 text-[14px] font-bold transition-colors ${popular ? "bg-brand text-white hover:bg-brand-ink" : "bg-ink text-canvas hover:opacity-90"}`}>
                        Choose {p.name}
                      </button>
                    </form>
                  )
                ) : (
                  <div className="rounded-xl border border-line-2 bg-raised py-3 text-center text-[12.5px] font-semibold text-muted">Only the owner can change plans</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SMS credits */}
      <Card className="mt-8">
        <CardHeader eyebrow="Add-on · pay as you go" title="SMS credits" sub="Text confirmations & reminders to clients without email — carrier rate + 10% service fee per message" />
        {!smsPlan ? (
          <div className="p-6 text-[13.5px] text-muted">
            SMS is included on the <b className="text-ink">Growth</b> and <b className="text-ink">Scale</b> plans — upgrade above to unlock it.
          </div>
        ) : (
          <div className="p-6">
            {sms === "reserved" && <div className="mb-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-bold text-green">Top-up reserved — it activates as soon as payment is confirmed.</div>}
            {sms === "badamount" && <div className="mb-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">Custom amounts: $5 – $1,000.</div>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Balance</div>
                <div className="font-display text-[32px] font-extrabold tracking-tight text-ink">${smsBalance.toFixed(2)}</div>
                <div className="text-[12px] text-muted">{smsMonth._count} message{smsMonth._count === 1 ? "" : "s"} · ${Number(smsMonth._sum.estCharge ?? 0).toFixed(2)} used this month</div>
                {smsPendingTopups.length > 0 && <div className="mt-1 text-[12px] font-bold text-brand">${smsPendingTopups.reduce((a, t) => a + Number(t.amount), 0).toFixed(2)} in top-ups awaiting payment</div>}
              </div>
              {isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  {[10, 50, 100].map((a) => (
                    <form key={a} method="post" action="/api/sms/topup">
                      <input type="hidden" name="amount" value={a} />
                      <button className="rounded-xl border border-line-2 bg-surface px-5 py-2.5 text-[14px] font-bold text-ink hover:border-brand/50 hover:text-brand">${a}</button>
                    </form>
                  ))}
                  <form method="post" action="/api/sms/topup" className="flex items-center gap-1.5">
                    <input name="amount" type="number" min={5} max={1000} step="1" placeholder="Custom" className="h-[42px] w-24 rounded-xl border border-line-2 bg-surface px-3 text-sm outline-none focus:border-brand" />
                    <button className="rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-ink">Add</button>
                  </form>
                </div>
              )}
            </div>
            {smsRecent.length > 0 && (
              <div className="mt-5 border-t border-line-2 pt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Recent messages</div>
                <ul className="space-y-1.5">
                  {smsRecent.map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-ink-2">{m.to} · <span className="capitalize">{m.kind}</span> · <span className={m.status.startsWith("SKIP") || m.status === "FAILED" ? "text-rose" : "text-green"}>{m.status.toLowerCase().replaceAll("_", " ")}</span></span>
                      <span className="font-bold text-ink">{Number(m.finalCharge ?? m.estCharge) > 0 ? `-$${Number(m.finalCharge ?? m.estCharge).toFixed(4)}` : "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add-ons */}
      <Card className="mt-8">
        <CardHeader eyebrow="Add-ons" title="Extras" sub="Available on any plan" />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-line-2 bg-raised p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-wash text-purple"><MessageSquareText className="size-4.5" /></div>
            <div>
              <div className="text-[14px] font-bold text-ink">{ADDONS[0].name}</div>
              <div className="mt-0.5 text-[12.5px] text-muted">{ADDONS[0].note}</div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">Coming soon</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-line-2 bg-raised p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-wash text-blue"><Globe className="size-4.5" /></div>
            <div>
              <div className="text-[14px] font-bold text-ink">{ADDONS[1].name}</div>
              <div className="mt-0.5 text-[12.5px] text-muted">{ADDONS[1].note}</div>
              <Link href="/settings" className="mt-1.5 inline-block text-[11.5px] font-bold text-brand hover:underline">Set up in Settings →</Link>
            </div>
          </div>
        </div>
      </Card>

      <p className="mt-6 text-center text-[12px] text-muted">
        7-day free trial on every new studio · Online card billing (Stripe) launches soon — plan changes today are activated by our team.
      </p>
    </div>
  );
}
