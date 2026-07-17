import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { orgSync } from "@/lib/org";
import { UserPlus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const avatarTones = ["bg-brand-wash text-brand", "bg-purple-wash text-purple", "bg-green-wash text-green", "bg-blue-wash text-blue"];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; scope?: string }> }) {
  const { q, scope } = await searchParams;
  const tenant = await getCurrentTenant();

  // Shared client directory (opt-in): owners in a franchise can view clients
  // across every location, read-only.
  const org = tenant.organizationId ? await db.organization.findUnique({ where: { id: tenant.organizationId } }) : null;
  const canShare = !!tenant.organizationId && !!orgSync(org?.policies).clients;
  const allScope = canShare && scope === "all";
  const orgTenants = allScope ? await db.tenant.findMany({ where: { organizationId: tenant.organizationId! }, select: { id: true, name: true, locationLabel: true } }) : [];
  const locName = new Map(orgTenants.map((t) => [t.id, t.locationLabel || t.name]));

  const where = {
    ...(allScope ? { tenantId: { in: orgTenants.map((t) => t.id) } } : { tenantId: tenant.id }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const clients = await db.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { packages: { where: { creditsLeft: { gt: 0 }, expiresAt: { gt: new Date() } } } },
  });

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Clients</h1>
          <p className="mt-1 text-sm text-muted">{clients.length} member{clients.length === 1 ? "" : "s"} in your studio</p>
        </div>
        <Link href="/clients/new" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-ink">
          <UserPlus className="size-4" /> Add client
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="relative max-w-[360px] flex-1">
          {allScope && <input type="hidden" name="scope" value="all" />}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone or email…"
            className="h-10 w-full rounded-xl border border-line-2 bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </form>
        {canShare && (
          <div className="flex rounded-xl border border-line-2 bg-surface p-0.5 text-[12px] font-bold">
            <Link href="/clients" className={`rounded-lg px-3 py-1.5 ${!allScope ? "bg-brand text-white" : "text-ink-2 hover:text-ink"}`}>This location</Link>
            <Link href="/clients?scope=all" className={`rounded-lg px-3 py-1.5 ${allScope ? "bg-brand text-white" : "text-ink-2 hover:text-ink"}`}>All locations</Link>
          </div>
        )}
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Client", "Contact", ...(allScope ? ["Location"] : []), "Channel", "Credits", "Member since"].map((h) => (
                <th key={h} className="px-[18px] py-[13px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.id} className="border-b border-line-2 transition-colors last:border-0 hover:bg-raised">
                <td className="px-[18px] py-[15px]">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarTones[i % avatarTones.length]}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    {c.tenantId === tenant.id
                      ? <Link href={`/clients/${c.id}`} className="text-[14px] font-semibold text-ink hover:text-brand">{c.name}</Link>
                      : <span className="text-[14px] font-semibold text-ink">{c.name}</span>}
                  </div>
                </td>
                <td className="px-[18px] py-[15px] text-[13.5px] text-ink-2">
                  <div>{c.phone ?? "—"}</div>
                  <div className="text-muted">{c.email ?? ""}</div>
                </td>
                {allScope && (
                  <td className="px-[18px] py-[15px]">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.tenantId === tenant.id ? "bg-brand-wash text-brand" : "bg-line-2 text-ink-2"}`}>{locName.get(c.tenantId) ?? "—"}</span>
                  </td>
                )}
                <td className="px-[18px] py-[15px]">
                  {c.channel ? (
                    <span className="rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-2">{c.channel}</span>
                  ) : "—"}
                </td>
                <td className="px-[18px] py-[15px] text-[13.5px] font-semibold text-ink">
                  {c.packages.reduce((s, p) => s + p.creditsLeft, 0) || "—"}
                </td>
                <td className="px-[18px] py-[15px] text-[13.5px] text-muted">
                  {c.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={allScope ? 6 : 5} className="px-[18px] py-16 text-center text-sm text-muted">No clients yet — add your first one.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
