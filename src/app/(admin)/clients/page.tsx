import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { UserPlus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const avatarTones = ["bg-brand-wash text-brand", "bg-purple-wash text-purple", "bg-green-wash text-green", "bg-blue-wash text-blue"];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const tenant = await getCurrentTenant();
  const clients = await db.client.findMany({
    where: {
      tenantId: tenant.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
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

      <form method="get" className="relative mb-4 max-w-[360px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, phone or email…"
          className="h-10 w-full rounded-xl border border-line-2 bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </form>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Client", "Contact", "Channel", "Credits", "Member since"].map((h) => (
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
                    <Link href={`/clients/${c.id}`} className="text-[14px] font-semibold text-ink hover:text-brand">{c.name}</Link>
                  </div>
                </td>
                <td className="px-[18px] py-[15px] text-[13.5px] text-ink-2">
                  <div>{c.phone ?? "—"}</div>
                  <div className="text-muted">{c.email ?? ""}</div>
                </td>
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
              <tr><td colSpan={5} className="px-[18px] py-16 text-center text-sm text-muted">No clients yet — add your first one.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
