"use client";

import { useEffect, useRef, useState } from "react";

// Loads the studio's PayPal JS SDK (public client-id only) and renders the
// official PayPal Buttons. createOrder / onApprove are wired by the caller to
// our own server routes — the SDK never sees an amount, and approval is always
// re-verified + captured server-side before anything is granted.

type PayPalNS = {
  Buttons: (opts: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
    onCancel?: () => void;
  }) => { render: (el: HTMLElement) => Promise<void> };
};

declare global {
  interface Window {
    paypal?: PayPalNS;
  }
}

const loaders = new Map<string, Promise<PayPalNS>>();

function loadSdk(clientId: string, currency: string): Promise<PayPalNS> {
  const key = `${clientId}|${currency}`;
  const existing = loaders.get(key);
  if (existing) return existing;
  const p = new Promise<PayPalNS>((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    const params = new URLSearchParams({ "client-id": clientId, currency: currency.toUpperCase(), intent: "capture", components: "buttons" });
    s.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK failed to load")));
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.body.appendChild(s);
  });
  loaders.set(key, p);
  return p;
}

export function PayPalButtonBox({
  clientId,
  currency,
  brand,
  disabled,
  createOrder,
  onApprove,
}: {
  clientId: string;
  currency: string;
  brand?: string;
  disabled?: boolean;
  createOrder: () => Promise<string>;
  onApprove: (orderID: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest callbacks without re-rendering the buttons.
  const cbs = useRef({ createOrder, onApprove });
  cbs.current = { createOrder, onApprove };

  useEffect(() => {
    let cancelled = false;
    loadSdk(clientId, currency)
      .then((pp) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = "";
        pp
          .Buttons({
            style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 45 },
            createOrder: () => cbs.current.createOrder(),
            onApprove: (data) => cbs.current.onApprove(data.orderID),
            onError: () => setError("PayPal had a problem. Please try again."),
          })
          .render(ref.current)
          .catch(() => {});
      })
      .catch(() => setError("Couldn't load PayPal. Please try again."));
    return () => { cancelled = true; };
  }, [clientId, currency]);

  return (
    <div>
      <div ref={ref} className={disabled ? "pointer-events-none opacity-50" : ""} style={brand ? undefined : undefined} />
      {error && <p className="mt-2 text-[12.5px] font-medium text-rose">{error}</p>}
    </div>
  );
}
