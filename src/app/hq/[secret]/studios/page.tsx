import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq, healthScore, hqTagsOf, mrrOf } from "@/lib/hq";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  TRIAL: "bg-brand-wash text-brand", ACTIVE: "bg-green-wash text-green",
  PAST_DUE: "bg-rose/10 text-rose", SUSPENDED: "bg-line-2 text-muted",
};

// Studio directory (Wave 16 B2): search, filters, health scores.
export default async function HqStudios({ params, searchParams }: {
  params: Promise<{ secret: string }>;
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const { secret } = await params;
  const { q, status, plan } = await searchParams;
  await assertHq(secret);
  const d30 = new Date(Date.now() - 30 * 86400_000);
  const d60 = new Date(Date.now() - 60 * 86400_000);

  const tenants = await db.tenant.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { clients: { some: { name: { contains: q, mode: "insensitive" } } } }] } : {}),
      ...(status && ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"].includes(status) ? { status: status as "ACTIVE" } : {}),
      ...(plan ? { plan } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { clients: true, supportTickets: { where: { status: { in: ["OPEN", "WAITING"] } } } } },
      users: { where: { active: true }, orderBy: { lastLoginAt: "desc" }, take: 1, select: { lastLoginAt: true } },
    },
  });
  const stats = await Promise.all(tenants.map(async (t) => {
    const [b30, bPrev] = await Promise.all([
      db.booking.count({ where: { tenantId: t.id, createdAt: { gt: d30 } } }),
      db.booking.count({ where: { tenantId: t.id, createdAt: { gt: d60, lte: d30 } } }),
    ]);
    return { t, b30, health: healthScore({ status: t.status, lastStaffLogin: t.users[0]?.lastLoginAt ?? null, bookings30: b30, bookingsPrev30: bPrev, openTickets: t._count.supportTickets }) };
  }));

  const filt = (k: string, v: string | undefined, label: string, on: boolean) => (
    <Link key={label} href={`/studios?${new URLSearchParams({ ...(q ? { q } : {}), ...(status && k !== "status" ? { status } : {}), ...(plan && k !== "plan" ? { plan } : {}), ...(v ? { [k]: v } : {}) })}`}
      className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? "bg-ink text-canvas" : "bg-line-2 text-ink-2 hover:text-ink"}`}>{label}</Link>
  );

  return (
    <div className="max-w-[1200px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Studios</h1>
      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search studios or their clients…" className="h-10 w-[320px] rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" />
        <button className="rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {filt("status", undefined, "All", !status)}
        {["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"].map((s) => filt("status", s, s.toLowerCase().replace("_", " "), status === s))}
        <span className="mx-1 text-muted">·</span>
        {["starter", "growth", "scale"].map((p) => filt("plan", p, p, plan === p))}
      </div>

      <Card className="mt-5">
        <table className="w-full text-left">
          <thead><tr className="border-b border-line-2">
            {["Studio", "Health", "Status", "Plan · MRR", "Clients", "Bookings 30d", "Open tickets", "Last staff login"].map((h) => (
              <th key={h} className="px-[14px] py-[12px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {stats.map(({ t, b30, health }) => (
              <tr key={t.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[14px] py-[12px]">
                  <Link href={`/t/${t.id}`} className="group block">
                    <span className="text-[13.5px] font-semibold text-ink group-hover:text-brand">{t.name}{t.organizationId && <span className="ml-1.5 rounded-full bg-purple-wash px-1.5 py-0.5 text-[9.5px] font-bold text-purple"><Building2 className="mr-0.5 inline size-3 -mt-0.5" /> {t.locationLabel || "location"}</span>}</span>
                    <span className="block text-[11px] text-muted">/{t.slug}{hqTagsOf(t).tags?.length ? ` · ${hqTagsOf(t).tags!.join(", ")}` : ""}</span>
                  </Link>
                </td>
                <td className="px-[14px] py-[12px]"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${health.tone}`}>{health.score} · {health.label}</span></td>
                <td className="px-[14px] py-[12px]"><span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${statusTone[t.status]}`}>{t.status.toLowerCase().replace("_", " ")}</span></td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{t.plan} · ${mrrOf(t)}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{t._count.clients}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{b30}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{t._count.supportTickets || "—"}</td>
                <td className="px-[14px] py-[12px] text-[12px] text-muted">{t.users[0]?.lastLoginAt ? t.users[0].lastLoginAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}</td>
              </tr>
            ))}
            {stats.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">No studios match.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
