import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

export default async function HqTeam({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const team = await db.user.findMany({ where: { role: "SUPERADMIN", tenantId: null }, orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">HQ Team</h1>
      <p className="mt-1 text-sm text-muted">Internal staff with Mission Control access. Role labels: Support, Developer, Finance, Sales.</p>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Members" />
          <ul className="divide-y divide-line-2">
            {team.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <span><b className="text-[13.5px] text-ink">{u.name}</b><span className="block text-[11.5px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""} · last login {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}</span></span>
                {u.email !== "owner@nexis-hq.com" ? (
                  <form method="post" action="/api/hq/ops"><input type="hidden" name="op" value="team-toggle" /><input type="hidden" name="id" value={u.id} /><input type="hidden" name="back" value="/team" /><button className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${u.active ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{u.active ? "Active" : "Disabled"}</button></form>
                ) : <span className="rounded-full bg-brand-wash px-2.5 py-1 text-[10.5px] font-bold text-brand">Owner</span>}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Add member" sub="Full HQ access — granular permissions later" />
          <form method="post" action="/api/hq/ops" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="op" value="team-add" />
            <input type="hidden" name="back" value="/team" />
            <input name="name" required placeholder="Name" className={field} />
            <input name="email" type="email" required placeholder="Email" className={field} />
            <select name="label" className={field}>{["Support", "Developer", "Finance", "Sales"].map((r) => <option key={r}>{r}</option>)}</select>
            <input name="password" required minLength={8} placeholder="Temporary password (8+)" className={field} />
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">Add member</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
