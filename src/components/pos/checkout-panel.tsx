import { Ticket, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { moneyFormatter } from "@/lib/tenant";
import { timeInTz } from "@/lib/tz";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

// The mini-POS checkout, shared by the calendar popup and the full page.
// `back` is where the checkout API returns to (it appends ?checkout=done|<err>).
export async function CheckoutPanel({ bookingId, tenantId, currency, timezone, back, error }: {
  bookingId: string;
  tenantId: string;
  currency: string;
  timezone: string;
  back: string;
  error?: string;
}) {
  const fmt = moneyFormatter(currency);
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId },
    include: {
      client: { include: { packages: { where: { creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } }, include: { package: true } } } },
      session: { include: { classType: true } },
    },
  });
  if (!booking) return <p className="p-6 text-sm text-muted">That booking is gone.</p>;

  const products = await db.product.findMany({ where: { tenantId, active: true, stock: { gt: 0 } }, orderBy: { name: "asc" }, take: 8 });
  const packs = await db.package.findMany({
    where: { tenantId, active: true, kind: booking.session.classType.kind },
    orderBy: { price: "asc" },
    take: 6,
  });
  const credits = booking.client.packages.reduce((s, p) => s + p.creditsLeft, 0);
  const dropIn = Number(booking.session.classType.price);
  const qty = booking.qty;

  return (
    <div>
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Check out {booking.client.name}{qty > 1 ? ` (×${qty})` : ""}</h2>
      <p className="mt-0.5 text-[13px] text-muted">
        {booking.session.classType.name} · {booking.session.startsAt.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" })} {timeInTz(booking.session.startsAt, timezone)}
        {booking.status === "CHECKED_IN" ? " · already checked in" : ""}
      </p>

      {error && error !== "done" && (
        <div className="mt-3 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {error === "no-credits" ? "Not enough usable package credits on this client." : error === "voucher" ? "That voucher code isn't valid." : error === "stock" ? "Not enough stock for that product." : "That didn't work — try again."}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {credits < qty && packs.length > 0 && (
          <Card className="md:col-span-2 border-brand/30">
            <CardHeader eyebrow="Upsell" title="Sell a package & use it now" sub="They buy the pack, this class takes the first credit — one step" />
            <form method="post" action={`/api/bookings/${booking.id}/checkout`} className="flex flex-wrap items-end gap-3 p-5">
              <input type="hidden" name="mode" value="sellpack" />
              <input type="hidden" name="back" value={back} />
              <div className="min-w-[220px] flex-1">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">Package</label>
                <select name="packageId" className={field}>
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {fmt.format(Number(p.price))}{p.interval === "month" ? "/mo" : p.interval === "year" ? "/yr" : ""} · {p.credits} credits</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">Paid by</label>
                <div className="flex gap-1.5">
                  {(["cash", "transfer", "card"] as const).map((m, i) => (
                    <label key={m} className="cursor-pointer">
                      <input type="radio" name="method" value={m} defaultChecked={i === 0} className="peer sr-only" />
                      <span className="block rounded-[10px] border border-line bg-surface px-3 py-2 text-center text-[12.5px] font-bold capitalize text-ink-2 peer-checked:border-brand peer-checked:bg-brand-wash peer-checked:text-brand">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="h-10 rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white hover:bg-brand-ink">
                Sell, use {qty} credit{qty === 1 ? "" : "s"} &amp; check in
              </button>
            </form>
          </Card>
        )}
        <Card className={credits < qty ? "opacity-55" : ""}>
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
              <button disabled={credits < qty} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-bold text-white hover:bg-brand-ink disabled:opacity-40">
                <Ticket className="size-4" /> Use {qty} credit{qty === 1 ? "" : "s"} &amp; check in
              </button>
            </form>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Or take payment" title="Charge for this visit" sub={`Drop-in ${fmt.format(dropIn)}${qty > 1 ? ` × ${qty} = ${fmt.format(dropIn * qty)}` : ""}`} />
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
