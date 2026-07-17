import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq, mrrOf, hqTagsOf } from "@/lib/hq";
import { customFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function HqBilling({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const tenants = await db.tenant.findMany({ orderBy: { createdAt: "asc" } });
  const gmv = await db.order.groupBy({ by: ["tenantId"], where: { status: "PAID" }, _sum: { total: true } });
  const sms = await db.smsTopup.groupBy({ by: ["tenantId"], where: { status: "PAID" }, _sum: { amount: true } });
  const g = new Map(gmv.map((x) => [x.tenantId, Number(x._sum.total ?? 0)]));
  const s = new Map(sms.map((x) => [x.tenantId, Number(x._sum.amount ?? 0)]));
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  return (
    <div className="max-w-[1100px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-muted">Subscriptions and lifetime value per studio. Refunds & coupons arrive with Stripe keys.</p>
      <Card className="mt-5">
        <table className="w-full text-left">
          <thead><tr className="border-b border-line-2">
            {["Studio", "Plan", "MRR to us", "Custom features", "SMS topups", "Lifetime GMV", "Comp"].map((h) => <th key={h} className="px-[14px] py-[12px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{h}</th>)}
          </tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-line-2 last:border-0 hover:bg-raised">
                <td className="px-[14px] py-[12px]"><Link href={`/t/${t.id}`} className="text-[13.5px] font-semibold text-ink hover:text-brand">{t.name}</Link></td>
                <td className="px-[14px] py-[12px] text-[12.5px] capitalize text-ink-2">{t.plan} · {t.status.toLowerCase()}</td>
                <td className="px-[14px] py-[12px] text-[13px] font-bold text-ink">{fmt.format(mrrOf(t))}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{customFeatures(t).filter((f) => f.active).length || "—"}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">{s.get(t.id) ? fmt.format(s.get(t.id)!) : "—"}</td>
                <td className="px-[14px] py-[12px] text-[12.5px] text-ink-2">${(g.get(t.id) ?? 0).toLocaleString()}</td>
                <td className="px-[14px] py-[12px]">{hqTagsOf(t).comp ? <span className="rounded-full bg-purple-wash px-2 py-0.5 text-[10.5px] font-bold text-purple">FREE</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
