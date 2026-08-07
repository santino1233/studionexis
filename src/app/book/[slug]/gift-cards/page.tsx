import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, Check } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { studioStripeEnabled } from "@/lib/stripe";
import { studioPayPalPublic } from "@/lib/paypal";
import { moneyFormatter } from "@/lib/tenant";
import { CustomerNav } from "@/components/customer/nav";
import { GiftCardCheckout } from "@/components/customer/gift-card-checkout";
import { normaliseCode, giftCardStatusLabel, GIFT_CARD_MIN, GIFT_CARD_MAX } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

const PRESETS = [25, 50, 100, 200];

export default async function GiftCardsBuyPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string; check?: string }>;
}) {
  const { slug } = await params;
  const { ok, err, check } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const stripeOn = studioStripeEnabled(tenant);
  const paypal = studioPayPalPublic(tenant);
  const fmt = moneyFormatter(tenant.currency);

  // SSR balance check (?check=CODE) — no client JS needed.
  let checkResult: null | { found: boolean; balanceLabel?: string; initialLabel?: string; statusLabel?: string } = null;
  if (check) {
    const codeQ = normaliseCode(check);
    const card = codeQ
      ? await db.giftCard.findFirst({ where: { tenantId: tenant.id, code: codeQ }, select: { balance: true, initialAmount: true, status: true, expiresAt: true } })
      : null;
    if (!card) checkResult = { found: false };
    else {
      const expired = !!card.expiresAt && card.expiresAt.getTime() < Date.now();
      checkResult = {
        found: true,
        balanceLabel: fmt.format(Number(card.balance)),
        initialLabel: fmt.format(Number(card.initialAmount)),
        statusLabel: expired && card.status === "ACTIVE" ? "Expired" : giftCardStatusLabel(card.status),
      };
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="gift-cards" brand={brand} />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl px-6 py-14 text-center text-white" style={{ background: "linear-gradient(135deg, #221a12, #171310 60%, #241d14)" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: brand }}>Gift cards</div>
          <h1 className="mx-auto mt-3 max-w-[640px] font-display text-[38px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">Give the gift of movement.</h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-white/70">Send a {tenant.name} gift card by email in seconds. They pick the classes; you make their day.</p>
        </div>

        {ok === "purchased" && (
          <div className="mt-6 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">Payment received — the gift card is on its way. Thank you!</div>
        )}
        {err && (
          <div className="mt-6 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">
            {err === "cancelled" ? "Payment cancelled — no charge was made."
              : err === "amount" ? `Choose an amount between ${fmt.format(GIFT_CARD_MIN)} and ${fmt.format(GIFT_CARD_MAX)}.`
              : err === "email" ? "Please enter a valid recipient email."
              : err === "stripe" ? "Online gift-card purchases aren't available at this studio yet."
              : "Something went wrong — please try again."}
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Buy */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl" style={{ background: `${brand}1a`, color: brand }}><Gift className="size-5" /></span>
                <div>
                  <h2 className="font-display text-[20px] font-extrabold tracking-tight text-ink">Buy a gift card</h2>
                  <p className="text-[13px] text-muted">Delivered instantly by email with a redeem code.</p>
                </div>
              </div>

              {paypal ? (
                <GiftCardCheckout
                  slug={slug}
                  studioName={tenant.name}
                  currency={tenant.currency}
                  brand={brand}
                  presets={PRESETS.map((v) => ({ value: v, label: fmt.format(v) }))}
                  min={GIFT_CARD_MIN}
                  max={GIFT_CARD_MAX}
                  minLabel={fmt.format(GIFT_CARD_MIN)}
                  maxLabel={fmt.format(GIFT_CARD_MAX)}
                  stripeOn={stripeOn}
                  paypal={paypal}
                />
              ) : stripeOn ? (
                <form method="post" action="/api/public/gift-cards/checkout" className="mt-5 space-y-4">
                  <input type="hidden" name="slug" value={slug} />
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Amount ({tenant.currency})</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESETS.map((v) => (
                        <label key={v} className="block">
                          <input type="radio" name="amount" value={v} defaultChecked={v === 50} className="peer sr-only" />
                          <span className="block cursor-pointer rounded-xl border border-line-2 py-3 text-center text-[15px] font-bold text-ink-2 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white hover:border-ink/40">
                            {fmt.format(v)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block">
                      <input type="radio" name="amount" value="custom" className="peer sr-only" />
                      <span className="block text-[11.5px] text-muted peer-checked:text-ink">Prefer a different amount? Enter it below and it will be used.</span>
                    </label>
                    <input name="amountCustom" type="number" step="1" min={GIFT_CARD_MIN} max={GIFT_CARD_MAX} placeholder={`Custom amount (${fmt.format(GIFT_CARD_MIN)}–${fmt.format(GIFT_CARD_MAX)})`} className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Recipient email</label>
                    <input name="recipientEmail" type="email" required placeholder="them@example.com" className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Your email (for the receipt)</label>
                    <input name="purchaserEmail" type="email" placeholder="you@example.com" className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Message (optional)</label>
                    <textarea name="message" rows={3} maxLength={500} placeholder="Add a personal note…" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                  </div>
                  <button className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: brand }}>Continue to secure payment</button>
                  <p className="text-center text-[11.5px] text-muted">Payments are processed securely by {tenant.name} via Stripe.</p>
                </form>
              ) : (
                <div className="mt-5 rounded-xl border border-line-2 bg-raised px-4 py-6 text-center text-[13.5px] text-muted">
                  Online gift-card purchases aren&apos;t set up at this studio yet. Please ask the front desk — they can issue a gift card for you in person.
                </div>
              )}
            </div>
          </div>

          {/* Check balance + perks */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-[16px] font-extrabold tracking-tight text-ink">Check a balance</h3>
              <form method="get" className="mt-3 flex gap-2">
                <input name="check" defaultValue={check ?? ""} placeholder="GIFT-XXXX-XXXX-XXXX" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                <button className="shrink-0 rounded-xl px-4 text-[13px] font-bold text-white" style={{ background: brand }}>Check</button>
              </form>
              {checkResult && (
                checkResult.found ? (
                  <div className="mt-3 rounded-xl border border-line-2 bg-raised px-4 py-3 text-[13.5px]">
                    <div className="text-[22px] font-extrabold text-ink">{checkResult.balanceLabel}</div>
                    <div className="text-muted">remaining of {checkResult.initialLabel} · {checkResult.statusLabel}</div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-rose/20 bg-rose/5 px-4 py-3 text-[13px] font-medium text-rose">No gift card found with that code.</div>
                )
              )}
            </div>
            <div className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-[16px] font-extrabold tracking-tight text-ink">How it works</h3>
              <ul className="mt-3 space-y-2.5">
                {["Choose an amount and the recipient's email", "They receive a code (and a scannable QR) instantly", "Redeem at the studio or at checkout — partial use is fine", `Valid for a full year`].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-2"><Check className="mt-0.5 size-4 shrink-0" style={{ color: brand }} /> {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          <Link href={`/book/${slug}`} className="hover:text-ink">← Back to booking</Link>
          <span className="mx-2">·</span>
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
