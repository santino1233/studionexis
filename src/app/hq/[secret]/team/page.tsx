import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";
import { addHqAdmin, toggleHqAdmin } from "./actions";

export const dynamic = "force-dynamic";
const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand";
const OWNER_EMAIL = "owner@nexis-hq.com";

const BANNERS: Record<string, { tone: "ok" | "err"; text: string }> = {
  added: { tone: "ok", text: "HQ admin created — they can sign in now with the password you set." },
  enabled: { tone: "ok", text: "HQ admin re-enabled." },
  disabled: { tone: "ok", text: "HQ admin disabled — their login is now blocked." },
  email: { tone: "err", text: "Enter a valid email address." },
  weak: { tone: "err", text: "Password must be at least 10 characters." },
  dupe: { tone: "err", text: "A user with that email already exists." },
  owner: { tone: "err", text: "The owner account cannot be disabled." },
  self: { tone: "err", text: "You cannot disable your own account." },
  notfound: { tone: "err", text: "That HQ admin no longer exists." },
};

export default async function HqTeam({
  params,
  searchParams,
}: {
  params: Promise<{ secret: string }>;
  searchParams: Promise<{ ok?: string; err?: string; who?: string }>;
}) {
  const { secret } = await params;
  const sp = await searchParams;
  const auth = await assertHq(secret);
  const team = await db.user.findMany({ where: { role: "SUPERADMIN", tenantId: null }, orderBy: { createdAt: "asc" } });

  const banner = BANNERS[sp.ok ?? ""] ?? BANNERS[sp.err ?? ""];
  const bannerText =
    banner && sp.ok === "added" && sp.who ? `HQ admin ${sp.who} created — they can sign in now.` : banner?.text;
  const activeCount = team.filter((u) => u.active).length;

  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">HQ Admins</h1>
      <p className="mt-1 text-sm text-muted">
        Internal logins with full Mission Control access ({activeCount} active). The role label (Support, Developer, Finance,
        Sales) is a hint only — every HQ admin has the same SUPERADMIN privileges. Only an existing HQ admin can add or disable
        another.
      </p>

      {banner && (
        <div
          className={`mt-4 rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold ${
            banner.tone === "ok"
              ? "border-green/30 bg-green-wash text-green"
              : "border-rose/30 bg-rose/10 text-rose"
          }`}
        >
          {bannerText}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Members" sub="HQ superadmin logins" />
          <ul className="divide-y divide-line-2">
            {team.map((u) => {
              const isOwner = u.email === OWNER_EMAIL;
              const isSelf = u.id === auth.userId;
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <b className="text-[13.5px] text-ink">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-[10.5px] font-bold text-muted">(you)</span>}
                    </b>
                    <span className="block truncate text-[11.5px] text-muted">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ""} · last login{" "}
                      {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}
                    </span>
                  </span>
                  {isOwner ? (
                    <span className="shrink-0 rounded-full bg-brand-wash px-2.5 py-1 text-[10.5px] font-bold text-brand">Owner</span>
                  ) : isSelf ? (
                    <span className="shrink-0 rounded-full bg-green-wash px-2.5 py-1 text-[10.5px] font-bold text-green">Active</span>
                  ) : (
                    <form action={toggleHqAdmin} className="shrink-0">
                      <input type="hidden" name="secret" value={secret} />
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          u.active ? "bg-green-wash text-green" : "bg-line-2 text-muted"
                        }`}
                      >
                        {u.active ? "Active — click to disable" : "Disabled — click to enable"}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Add HQ admin" sub="Creates a new SUPERADMIN login for Mission Control" />
          <form action={addHqAdmin} className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="secret" value={secret} />
            <input name="name" required placeholder="Full name" className={field} />
            <input name="email" type="email" required placeholder="Email (used to sign in)" className={field} />
            <select name="label" className={field} defaultValue="Support">
              {["Support", "Developer", "Finance", "Sales"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <input
              name="password"
              type="password"
              required
              minLength={10}
              placeholder="Password (10+ characters)"
              className={field}
            />
            <button className="w-full rounded-[10px] bg-brand py-2.5 text-sm font-bold text-white">Add HQ admin</button>
            <p className="text-[11.5px] text-muted">
              Share the password securely — the new admin can change it after signing in. All HQ admins have the same access.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
