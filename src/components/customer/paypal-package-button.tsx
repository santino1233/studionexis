"use client";

import { PayPalButtonBox } from "./paypal-button-box";

// PayPal purchase button for a single package. Shown on the packages page only
// when the studio has PayPal enabled and the customer is signed in. Amount and
// client identity are resolved server-side from the session — this button just
// names the package.
export function PayPalPackageButton({
  clientId,
  currency,
  slug,
  packageId,
  brand,
}: {
  clientId: string;
  currency: string;
  slug: string;
  packageId: string;
  brand?: string;
}) {
  async function createOrder(): Promise<string> {
    const res = await fetch("/api/public/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind: "package", packageId }),
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error("create failed");
    return json.id as string;
  }

  async function onApprove(orderID: string): Promise<void> {
    const res = await fetch("/api/public/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, orderID }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok && json.redirect) window.location.assign(json.redirect);
    else window.location.assign(json.redirect || `/book/${slug}/packages?err=paypal`);
  }

  return (
    <div className="mt-2">
      <PayPalButtonBox clientId={clientId} currency={currency} brand={brand} createOrder={createOrder} onApprove={onApprove} />
    </div>
  );
}
