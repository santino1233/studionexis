"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";

// Booking upsell configuration + a live customer-facing preview.
//
// The backend (`policies.upsell`) and the real customer surface — the offer
// shown in the booking slide-over on /book/[slug] — already exist. This client
// component gives the admin (a) the same select/checkbox controls that POST to
// /api/settings, and (b) a live mock of exactly how each offer looks to a
// customer, updating as they choose packages. When a kind has no package
// selected the preview shows the neutral "no upsell" state, mirroring the
// no-op behaviour on the booking page.

type Pkg = { id: string; name: string; price: number; credits: number; interval: string };

const field =
  "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

function suffix(interval: string) {
  return interval === "month" ? "/mo" : interval === "year" ? "/yr" : "";
}

function OfferPreview({
  pkg,
  kindLabel,
  brand,
  fmt,
  hideIfActive,
}: {
  pkg: Pkg | undefined;
  kindLabel: string;
  brand: string;
  fmt: Intl.NumberFormat;
  hideIfActive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line-2 bg-canvas p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{kindLabel}</span>
        <span className="text-[10px] font-semibold text-muted">Customer view</span>
      </div>
      {pkg ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: `${brand}44`, background: `${brand}0d` }}>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: brand }}>
            <Lightbulb className="inline size-3 -mt-0.5" /> Save with a package
          </div>
          <div className="mt-1 text-[13.5px] font-bold text-ink">
            {pkg.name} — {fmt.format(pkg.price)}
            {suffix(pkg.interval)} for {pkg.credits} classes
          </div>
          <div className="text-[11.5px] text-muted">
            ≈ {fmt.format(pkg.price / Math.max(1, pkg.credits))} per class
          </div>
          <span
            className="mt-2.5 inline-block rounded-lg px-3.5 py-2 text-[12px] font-bold text-white"
            style={{ background: brand }}
          >
            Get the package →
          </span>
        </div>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line-2 px-4 py-6 text-center">
          <p className="text-[12.5px] font-semibold text-muted">No upsell shown</p>
          <p className="mt-0.5 text-[11.5px] text-muted">Customers booking a {kindLabel.toLowerCase()} see nothing extra.</p>
        </div>
      )}
      {pkg && hideIfActive && (
        <p className="mt-2 text-[11px] text-muted">Hidden for clients who already hold an active package.</p>
      )}
    </div>
  );
}

export function UpsellSettings({
  brand,
  currency,
  initial,
  groupPackages,
  privatePackages,
}: {
  brand: string;
  currency: string;
  initial: { groupPackageId: string; privatePackageId: string; hideIfActive: boolean };
  groupPackages: Pkg[];
  privatePackages: Pkg[];
}) {
  const [groupId, setGroupId] = useState(initial.groupPackageId);
  const [privateId, setPrivateId] = useState(initial.privatePackageId);
  const [hideIfActive, setHideIfActive] = useState(initial.hideIfActive);

  const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 });
  const groupPkg = groupPackages.find((p) => p.id === groupId);
  const privatePkg = privatePackages.find((p) => p.id === privateId);

  return (
    <Card className="mt-5">
      <CardHeader eyebrow="Selling" title="Booking upsell" sub="Offer a package while clients book — preview exactly what they'll see" />
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        <form method="post" action="/api/settings" className="space-y-4 p-6">
          <input type="hidden" name="section" value="upsell" />
          <div>
            <label className={label}>Upsell for group classes</label>
            <select name="groupPackageId" value={groupId} onChange={(e) => setGroupId(e.target.value)} className={field}>
              <option value="">— Don&apos;t upsell —</option>
              {groupPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmt.format(p.price)}
                  {suffix(p.interval)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Upsell for private sessions</label>
            <select name="privatePackageId" value={privateId} onChange={(e) => setPrivateId(e.target.value)} className={field}>
              <option value="">— Don&apos;t upsell —</option>
              {privatePackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmt.format(p.price)}
                  {suffix(p.interval)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-[13.5px] font-medium text-ink">
            <input
              name="hideIfActive"
              type="checkbox"
              checked={hideIfActive}
              onChange={(e) => setHideIfActive(e.target.checked)}
              className="size-4 accent-[#F97316]"
            />
            Hide the upsell when the client already has an active package
          </label>
          <div className="flex justify-end">
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
              Save upsell
            </button>
          </div>
        </form>

        <div className="space-y-3 border-t border-line-2 p-6 md:border-l md:border-t-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Live preview</div>
          <OfferPreview pkg={groupPkg} kindLabel="Group class" brand={brand} fmt={fmt} hideIfActive={hideIfActive} />
          <OfferPreview pkg={privatePkg} kindLabel="Private session" brand={brand} fmt={fmt} hideIfActive={hideIfActive} />
          <p className="text-[11px] text-muted">
            Shown in the booking panel when a client opens a class. Changes here update the preview instantly and go live when you save.
          </p>
        </div>
      </div>
    </Card>
  );
}
