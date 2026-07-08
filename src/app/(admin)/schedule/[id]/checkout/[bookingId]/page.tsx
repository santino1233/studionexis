import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ticket, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { timeInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

export default async function CheckoutPage({ params, searchParams }: {
  params: Promise<{ id: string; bookingId: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id, bookingId } = await params;
  const { checkout } = await searchParams;
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);

  const booking = await db.booking.findFirst({
    where: { id: bookingId, sessionId: id, tenantId: tenant.id },
    include: { client: { include: { packages: { where: { creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } }, include: { package: true } } } }, session: { include: { classType: true } } },
  });
  if (!booking) notFound();

  const products = await db.product.findMany({ where: { tenantId: tenant.id, active: true, stock: { gt: 0 } }, orderBy: { name: "asc" }, take: 8 });
  const credits = booking.client.packages.reduce((s, p) => s + p.creditsLeft, 0);
  const dropIn = Number(booking.session.classType.price);
  const back = `/schedule/${id}`;

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to class
      </Link>
      <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">Check out {booking.client.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {booking.session.classType.name} · {booking.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} {timeInTz(booking.session.startsAt, tenant.timezone)}
        {booking.status === "CHECKED_IN" ? " · already checked in" : ""}
      </p>

      {checkout && checkout !== "done" && (
        <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {checkout === "no-credits" ? "No usable package credits on this client." : checkout === "voucher" ? "That voucher code isn't valid." : checkout === "stock" ? "Not enough stock for that product." : "That didn't work — try again."}
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Package credit */}
        <Card className={credits === 0 ? "opacity-55" : ""}>
          <CardHeader eyebrow="Fastest" title="Use package credit" sub={credits > 0 ? `${credits} credit${credits === 1 ? "" : "s"} available` : "No active credits"} />
          <div className="p-5">
            {booking.client.packages.map((p) => (
              <div key={p.id} className="mb-2 flex items-center justify-between rounded-xl bg-raised px-3.5 py-2.5 text-[13px]">
                <span className="font-semibold text-ink">{p.package.name}</span>
                <span className="font-bold" style={{ color: "var(--color-brand)" }}>{p.creditsLeft} left</span>
              </div>
            ))}
            <form method="post" action={`/api/bookings/${booking.id}/checkout`}>
              <input type="hidden" name="mode" value="credit" />
              <input type="hidden" name="back" value={back} />
              <button disabled={credits === 0} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink disabled:opacity-40">
                <Ticket className="size-4" /> Use 1 credit &amp; check in
              </button>
            </form>
          </div>
        </Card>

        {/* Charge */}
        <Card>
          <CardHeader eyebrow="Or take payment" title="Charge for this visit" sub={`Drop-in ${fmt.format(dropIn)}`} />
          <form method="post" action={`/api/bookings/${booking.id}/checkout`} className="space-y-3.5 p-5">
            <input type="hidden" name="mode" value="charge" />
            <input type="hidden" name="back" value={back} />
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">Payment method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "transfer", "card"] as const).map((m, i) => (
                  <label key={m} className="cursor-pointer">
                    <input type="radio" name="method" value={m} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="block rounded-[10px] border border-line bg-surface px-2 py-2 text-center text-[12.5px] font-bold capitalize text-ink-2 peer-checked:border-brand peer-checked:bg-brand-wash peer-checked:text-brand">{m}</span>
                  </label>
                ))}
              </div>
            </div>
            {products.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">Add merch (optional)</label>
                <div className="space-y-1.5">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-2">
                      <span className="text-[13px] font-semibold text-ink">{p.name} <span className="text-muted">· {fmt.format(Number(p.price))}</span></span>
                      <input name={`product_${p.id}`} type="number" min={0} max={p.stock} placeholder="0" className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-center text-sm outline-none focus:border-brand" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input name="voucherCode" placeholder="Voucher code (optional)" className={`${field} uppercase placeholder:normal-case`} />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-bold text-canvas hover:opacity-90">
              <CreditCard className="size-4" /> Charge &amp; check in
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
