import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const roleTone: Record<string, string> = {
  OWNER: "bg-brand-wash text-brand",
  STAFF: "bg-blue-wash text-blue",
  INSTRUCTOR: "bg-purple-wash text-purple",
};

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const tenant = await getCurrentTenant();
  const session = await getSession();
  const isOwner = session?.role === "OWNER";
  const team = await db.user.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { sessionsTaught: true } } },
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Team</h1>
      <p className="mt-1 text-sm text-muted">Staff run the front desk; instructors appear on the schedule and see their own classes.</p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {error === "exists" ? "That email is already on the team." : error === "limit" ? "You've reached your plan's team limit — upgrade in Plan & Billing." : "Fill everything in (password at least 8 characters)."}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line-2">
                {["Member", "Role", "Commission", "Classes taught", "Status", ""].map((h, i) => (
                  <th key={i} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                  <td className="px-[18px] py-[14px]">
                    {isOwner ? (
                      <Link href={`/team/${u.id}`} className="group block">
                        <div className="text-[14px] font-semibold text-ink group-hover:text-brand">{u.name}</div>
                        <div className="text-[12px] text-muted">{u.email}</div>
                      </Link>
                    ) : (
                      <>
                        <div className="text-[14px] font-semibold text-ink">{u.name}</div>
                        <div className="text-[12px] text-muted">{u.email}</div>
                      </>
                    )}
                  </td>
                  <td className="px-[18px] py-[14px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${roleTone[u.role] ?? "bg-line-2 text-ink-2"}`}>{u.role.toLowerCase()}</span>
                  </td>
                  <td className="px-[18px] py-[14px]">
                    {isOwner ? (
                      <form method="post" action={`/api/team/${u.id}`} className="flex items-center gap-1">
                        <input type="hidden" name="action" value="rate" />
                        <input name="rate" type="number" min={0} max={100} step="0.5" defaultValue={Number(u.commissionRate)} className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-center text-[12.5px] outline-none focus:border-brand" />
                        <span className="text-[12px] text-muted">%</span>
                        <button className="rounded-lg bg-line-2 px-2 py-1 text-[11px] font-bold text-ink-2 hover:text-ink">Set</button>
                      </form>
                    ) : (
                      <span className="text-[13px] text-ink-2">{Number(u.commissionRate)}%</span>
                    )}
                  </td>
                  <td className="px-[18px] py-[14px] text-[13px] text-ink-2">{u._count.sessionsTaught}</td>
                  <td className="px-[18px] py-[14px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${u.active ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{u.active ? "Active" : "Deactivated"}</span>
                  </td>
                  <td className="px-[18px] py-[14px]">
                    {isOwner && u.role !== "OWNER" && (
                      <form method="post" action={`/api/team/${u.id}`} className="flex justify-end">
                        <input type="hidden" name="action" value={u.active ? "deactivate" : "activate"} />
                        <button className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${u.active ? "bg-line-2 text-ink-2 hover:bg-rose/10 hover:text-rose" : "bg-green-wash text-green"}`}>
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader title="Add team member" sub="They sign in with this email + password" />
            <form method="post" action="/api/team" className="space-y-3.5 p-5">
              <input name="name" required placeholder="Full name" className={field} />
              <input name="email" type="email" required placeholder="Email" className={field} />
              <select name="role" className={field}>
                <option value="STAFF">Staff — front desk & sales</option>
                <option value="INSTRUCTOR">Instructor — teaches classes</option>
              </select>
              <input name="password" type="text" required minLength={8} placeholder="Temporary password (8+ chars)" className={field} />
              <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Add member</button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
