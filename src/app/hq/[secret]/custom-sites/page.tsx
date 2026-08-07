import Link from "next/link";
import { Building2, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW", "IN_PROGRESS", "DELIVERED"] as const;
const tone: Record<string, string> = {
  NEW: "bg-blue-wash text-blue",
  IN_PROGRESS: "bg-brand-wash text-brand",
  DELIVERED: "bg-green-wash text-green",
};
const nice: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", DELIVERED: "Delivered" };

type Brief = {
  businessName?: string; goals?: string; style?: string; references?: string;
  brandAssets?: string; extra?: string; name?: string; email?: string; phone?: string;
};

// HQ fulfilment queue for done-for-you custom-website orders (Wave 12 website
// suite). Only paid orders (amountPaid > 0) reach the queue. Work each order
// NEW → IN_PROGRESS → DELIVERED. Mutations go through /api/hq/ops.
export default async function HqCustomSites({ params, searchParams }: {
  params: Promise<{ secret: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { secret } = await params;
  const { status } = await searchParams;
  await assertHq(secret);

  const active = (STATUSES as readonly string[]).includes(status ?? "") ? status : "";
  const orders = await db.customSiteOrder.findMany({
    where: { amountPaid: { gt: 0 }, ...(active ? { status: active } : {}) },
    orderBy: [{ createdAt: "desc" }],
    include: { tenant: { select: { name: true, slug: true } } },
    take: 200,
  });
  const counts = Object.fromEntries(
    await Promise.all(STATUSES.map(async (st) => [st, await db.customSiteOrder.count({ where: { amountPaid: { gt: 0 }, status: st } })] as const)),
  ) as Record<string, number>;

  const filt = (href: string, labelText: string, on: boolean, badge?: number) => (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? "bg-ink text-canvas" : "bg-line-2 text-ink-2 hover:text-ink"}`}>
      {labelText}{badge !== undefined && badge > 0 ? ` (${badge})` : ""}
    </Link>
  );

  return (
    <div className="max-w-[1100px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Custom sites</h1>
      <p className="mt-1 text-[13px] text-muted">Paid done-for-you website orders. Charged on the Nexis HQ Stripe account.</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {filt("/custom-sites", "All", !active)}
        {STATUSES.map((st) => filt(`/custom-sites?status=${st}`, nice[st], active === st, counts[st]))}
      </div>

      <div className="mt-5 space-y-3">
        {orders.map((o) => {
          const b = (o.brief ?? {}) as Brief;
          return (
            <Card key={o.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${tone[o.status] ?? "bg-line-2 text-ink-2"}`}>{nice[o.status] ?? o.status}</span>
                    <span className="text-[15px] font-bold text-ink">{b.businessName || o.tenant.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                    <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {o.tenant.name} · {o.tenant.slug}</span>
                    <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {o.contact}</span>
                    <span>${Number(o.amountPaid).toFixed(0)} paid · {o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {STATUSES.filter((st) => st !== o.status).map((st) => (
                    <form key={st} method="post" action="/api/hq/ops">
                      <input type="hidden" name="op" value="custom-site-status" />
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value={st} />
                      <input type="hidden" name="back" value={active ? `/custom-sites?status=${active}` : "/custom-sites"} />
                      <button className="rounded-lg bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:text-ink">→ {nice[st]}</button>
                    </form>
                  ))}
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-line-2 pt-3 text-[13px] sm:grid-cols-2">
                {([
                  ["Goals", b.goals],
                  ["Look & feel", b.style],
                  ["References", b.references],
                  ["Brand assets", b.brandAssets],
                  ["Notes", b.extra],
                ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
        {orders.length === 0 && <Card className="px-5 py-12 text-center text-sm text-muted">No orders here.</Card>}
      </div>
    </div>
  );
}
