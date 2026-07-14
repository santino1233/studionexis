import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/access";
import { configOf } from "@/lib/earnings";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";
const save = "rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink";

const roleTone: Record<string, string> = {
  OWNER: "bg-brand-wash text-brand",
  MANAGER: "bg-green-wash text-green",
  STAFF: "bg-blue-wash text-blue",
  INSTRUCTOR: "bg-purple-wash text-purple",
};

export default async function StaffProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await getSession();
  if (session?.role !== "OWNER") notFound();
  const fmt = moneyFormatter(tenant.currency);

  const [user, taughtThisMonth, taughtTotal] = await Promise.all([
    db.user.findFirst({ where: { id, tenantId: tenant.id } }),
    db.classSession.count({
      where: {
        tenantId: tenant.id, instructorId: id, status: "COMPLETED",
        startsAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.classSession.count({ where: { tenantId: tenant.id, instructorId: id, status: "COMPLETED" } }),
  ]);
  if (!user) notFound();
  const isOwnerRow = user.role === "OWNER";

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/team" className="text-[12.5px] font-bold text-muted hover:text-ink">← Team</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">{user.name}</h1>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${roleTone[user.role] ?? "bg-line-2 text-ink-2"}`}>{ROLE_LABELS[user.role] ?? user.role}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.active ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{user.active ? "Active" : "Deactivated"}</span>
        {user.role === "INSTRUCTOR" && <span className="text-[12.5px] text-muted">{taughtThisMonth} classes this month · {taughtTotal} all-time</span>}
      </div>

      {sp.saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Saved.</div>}
      {sp.error && (
        <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {sp.error === "exists" ? "That email is already used by another team member." : sp.error === "password" ? "Password needs at least 8 characters." : "Check the fields and try again."}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Profile & contact" sub="Who they are and how to reach them" />
            <form method="post" action={`/api/team/${user.id}`} className="space-y-3.5 p-5">
              <input type="hidden" name="action" value="profile" />
              <div>
                <label className={label}>Full name</label>
                <input name="name" required defaultValue={user.name} className={field} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Email (login)</label>
                  <input name="email" type="email" required defaultValue={user.email} className={field} />
                </div>
                <div>
                  <label className={label}>Phone</label>
                  <input name="phone" defaultValue={user.phone ?? ""} placeholder="555-0100" className={field} />
                </div>
              </div>
              {!isOwnerRow && (
                <div>
                  <label className={label}>Role</label>
                  <select name="role" defaultValue={user.role} className={field}>
                    <option value="STAFF">Reception — front desk & sales</option>
                    <option value="INSTRUCTOR">Instructor — teaches classes</option>
                    <option value="MANAGER">Manager — runs the studio (no billing/payroll)</option>
                  </select>
                </div>
              )}
              <button className={save}>Save profile</button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Login & security" sub="Set a new password for this account" />
            <form method="post" action={`/api/team/${user.id}`} className="flex gap-2 p-5">
              <input type="hidden" name="action" value="password" />
              <input name="password" type="text" required minLength={8} placeholder="New password (8+ characters)" className={field} />
              <button className="shrink-0 rounded-[10px] bg-line-2 px-4 text-[12.5px] font-bold text-ink-2 hover:text-ink">Set password</button>
            </form>
          </Card>

          {!isOwnerRow && (
            <Card>
              <CardHeader title={user.active ? "Deactivate" : "Reactivate"} sub={user.active ? "They keep their history but can't sign in" : "Restore their access"} />
              <form method="post" action={`/api/team/${user.id}`} className="p-5">
                <input type="hidden" name="action" value={user.active ? "deactivate" : "activate"} />
                <input type="hidden" name="back" value={`/team/${user.id}`} />
                <button className={`rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold ${user.active ? "bg-rose/10 text-rose hover:bg-rose/20" : "bg-green-wash text-green"}`}>
                  {user.active ? "Deactivate account" : "Reactivate account"}
                </button>
              </form>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Pay" sub="Base salary and hourly rate — used by the payroll report" />
            <form method="post" action={`/api/team/${user.id}`} className="space-y-3.5 p-5">
              <input type="hidden" name="action" value="pay" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Base salary / month ({tenant.currency})</label>
                  <input name="baseSalary" type="number" step="0.01" min={0} defaultValue={Number(user.baseSalary)} className={field} />
                </div>
                <div>
                  <label className={label}>Hourly rate ({tenant.currency})</label>
                  <input name="hourlyRate" type="number" step="0.01" min={0} defaultValue={Number(user.hourlyRate)} className={field} />
                </div>
              </div>
              <p className="text-[12px] text-muted">Currently {fmt.format(Number(user.baseSalary))}/month base{Number(user.hourlyRate) > 0 ? ` + ${fmt.format(Number(user.hourlyRate))}/hour` : ""}. Commission for instructors is set below.</p>
              <button className={save}>Save pay</button>
            </form>
          </Card>

          {user.role === "INSTRUCTOR" && (() => {
            const cfg = configOf(user);
            const tiers = cfg.tiers?.length ? cfg.tiers : [{ classes: 0, pct: Number(user.commissionRate) || 20 }, { classes: 50, pct: 25 }, { classes: 100, pct: 30 }];
            const rows = cfg.rows?.length ? cfg.rows : [{ people: 1, amount: 20 }, { people: 2, amount: 30 }, { people: 4, amount: 40 }, { people: 6, amount: 50 }];
            const radio = "flex items-start gap-3 rounded-xl border border-line-2 p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-wash/40";
            return (
              <Card>
                <CardHeader title="Commission" sub="Pick how this instructor earns from classes" />
                <form method="post" action={`/api/team/${user.id}`} className="space-y-3 p-5">
                  <input type="hidden" name="action" value="commission" />

                  <label className={radio}>
                    <input type="radio" name="mode" value="percent" defaultChecked={user.commissionMode === "percent"} className="mt-1 accent-[#F97316]" />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">Percentage of class revenue</div>
                      <div className="mt-2 flex items-center gap-2">
                        <input name="rate" type="number" min={0} max={100} step="0.5" defaultValue={Number(user.commissionRate)} className={`${field} w-24`} />
                        <span className="text-[12.5px] text-muted">% of every class&apos;s revenue</span>
                      </div>
                    </div>
                  </label>

                  <label className={radio}>
                    <input type="radio" name="mode" value="percent_tiered" defaultChecked={user.commissionMode === "percent_tiered"} className="mt-1 accent-[#F97316]" />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">Tiered % by classes taught per month</div>
                      <div className="mt-2 space-y-1.5">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-2 text-[12.5px] text-muted">
                            From <input name={`tier_classes_${i}`} type="number" min={0} defaultValue={tiers[i]?.classes ?? ""} className={`${field} w-20`} /> classes →
                            <input name={`tier_pct_${i}`} type="number" min={0} max={100} step="0.5" defaultValue={tiers[i]?.pct ?? ""} className={`${field} w-20`} /> %
                          </div>
                        ))}
                      </div>
                      <label className="mt-2.5 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                        <input type="checkbox" name="retroactive" defaultChecked={cfg.retroactive ?? false} className="size-4 accent-[#F97316]" />
                        Retroactive — reaching a tier re-prices ALL of that month&apos;s classes in payroll
                      </label>
                    </div>
                  </label>

                  <label className={radio}>
                    <input type="radio" name="mode" value="fixed_per_class" defaultChecked={user.commissionMode === "fixed_per_class"} className="mt-1 accent-[#F97316]" />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">Fixed amount per class</div>
                      <div className="mt-2 flex items-center gap-2">
                        <input name="fixedAmount" type="number" min={0} step="0.01" defaultValue={cfg.amount ?? 15} className={`${field} w-28`} />
                        <span className="text-[12.5px] text-muted">{tenant.currency} per class taught</span>
                      </div>
                    </div>
                  </label>

                  <label className={radio}>
                    <input type="radio" name="mode" value="per_head" defaultChecked={user.commissionMode === "per_head"} className="mt-1 accent-[#F97316]" />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">By people in the class</div>
                      <div className="mt-2 space-y-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-2 text-[12.5px] text-muted">
                            <input name={`head_people_${i}`} type="number" min={1} defaultValue={rows[i]?.people ?? ""} className={`${field} w-20`} />+ people →
                            <input name={`head_amount_${i}`} type="number" min={0} step="0.01" defaultValue={rows[i]?.amount ?? ""} className={`${field} w-24`} /> {tenant.currency}
                          </div>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[11.5px] text-muted">The highest matching row applies (e.g. 1→$20, 2→$30: a class of 3 pays $30).</p>
                    </div>
                  </label>

                  <button className={save}>Save commission</button>
                </form>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
