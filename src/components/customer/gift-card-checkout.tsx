"use client";

import { useState } from "react";
import { PayPalButtonBox } from "./paypal-button-box";

// Client-side gift-card purchase panel used whenever the studio has PayPal
// enabled (with or without Stripe). It owns the amount/recipient inputs once and
// offers every payment method the studio has switched on:
//   · Stripe  → normal form POST to the existing hosted-checkout route (unchanged)
//   · PayPal  → JS SDK buttons; create-order + capture happen on our server
// If only Stripe is on, the page keeps using its original server-rendered form
// (this component is not mounted), so the pure-Stripe path is untouched.

type Preset = { value: number; label: string };

export function GiftCardCheckout({
  slug,
  studioName,
  currency,
  brand,
  presets,
  min,
  max,
  minLabel,
  maxLabel,
  stripeOn,
  paypal,
}: {
  slug: string;
  studioName: string;
  currency: string;
  brand: string;
  presets: Preset[];
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  stripeOn: boolean;
  paypal: { clientId: string } | null;
}) {
  const [amount, setAmount] = useState<number | "custom">(presets.find((p) => p.value === 50)?.value ?? presets[0]?.value ?? 50);
  const [custom, setCustom] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const effective = (() => {
    const c = Number(custom) || 0;
    const p = amount === "custom" ? 0 : Number(amount) || 0;
    return Math.round((c > 0 ? c : p) * 100) / 100;
  })();
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail);
  const valid = effective >= min && effective <= max && emailOk;

  async function createOrder(): Promise<string> {
    setErr(null);
    if (!valid) {
      setErr(!emailOk ? "Enter a valid recipient email." : `Choose an amount between ${minLabel} and ${maxLabel}.`);
      throw new Error("invalid");
    }
    const res = await fetch("/api/public/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind: "giftcard", amount: amount === "custom" ? 0 : amount, amountCustom: Number(custom) || 0, recipientEmail, purchaserEmail, message }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.id) { setErr("Couldn't start the PayPal payment."); throw new Error("create failed"); }
    return json.id as string;
  }

  async function onApprove(orderID: string): Promise<void> {
    const res = await fetch("/api/public/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, orderID }),
    });
    const json = await res.json().catch(() => ({}));
    window.location.assign((json && json.redirect) || `/book/${slug}/gift-cards?err=stripe`);
  }

  const inputCls = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

  const fields = (
    <>
      <div>
        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Amount ({currency})</label>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((v) => (
            <label key={v.value} className="block">
              <input type="radio" name="amount" value={v.value} checked={amount === v.value} onChange={() => setAmount(v.value)} className="peer sr-only" />
              <span className="block cursor-pointer rounded-xl border border-line-2 py-3 text-center text-[15px] font-bold text-ink-2 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white hover:border-ink/40">
                {v.label}
              </span>
            </label>
          ))}
        </div>
        <label className="mt-2 block">
          <input type="radio" name="amount" value="custom" checked={amount === "custom"} onChange={() => setAmount("custom")} className="peer sr-only" />
          <span className="block text-[11.5px] text-muted peer-checked:text-ink">Prefer a different amount? Enter it below and it will be used.</span>
        </label>
        <input name="amountCustom" type="number" step="1" min={min} max={max} value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value) setAmount("custom"); }} placeholder={`Custom amount (${minLabel}–${maxLabel})`} className={`mt-2 ${inputCls}`} />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Recipient email</label>
        <input name="recipientEmail" type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="them@example.com" className={inputCls} />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Your email (for the receipt)</label>
        <input name="purchaserEmail" type="email" value={purchaserEmail} onChange={(e) => setPurchaserEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Message (optional)</label>
        <textarea name="message" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a personal note…" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
      </div>
    </>
  );

  return (
    <div className="mt-5 space-y-4">
      {stripeOn ? (
        <form method="post" action="/api/public/gift-cards/checkout" className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          {fields}
          <button className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: brand }}>
            Pay by card (Stripe)
          </button>
        </form>
      ) : (
        <div className="space-y-4">{fields}</div>
      )}

      {paypal && (
        <div className="space-y-2">
          {stripeOn && (
            <div className="flex items-center gap-3 py-1 text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              <span className="h-px flex-1 bg-line-2" /> or <span className="h-px flex-1 bg-line-2" />
            </div>
          )}
          <PayPalButtonBox clientId={paypal.clientId} currency={currency} brand={brand} disabled={!valid} createOrder={createOrder} onApprove={onApprove} />
          {err && <p className="text-[12.5px] font-medium text-rose">{err}</p>}
        </div>
      )}

      <p className="text-center text-[11.5px] text-muted">Payments are processed securely by {studioName}.</p>
    </div>
  );
}
