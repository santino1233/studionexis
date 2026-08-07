import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Package } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { studioStripeEnabled } from "@/lib/stripe";
import { studioPayPalPublic } from "@/lib/paypal";
import { moneyFormatter } from "@/lib/tenant";
import { CustomerNav } from "@/components/customer/nav";
import { PayPalPackageButton } from "@/components/customer/paypal-package-button";

export const dynamic = "force-dynamic";

export default async function BuyPackagesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; kind?: string; err?: string }>;
}) {
  const { slug } = await params;
  const { ok, kind, err } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const stripeOn = studioStripeEnabled(tenant);
  const paypal = studioPayPalPublic(tenant);
  const fmt = moneyFormatter(tenant.currency);
  const cs = await getCustomerSession();
  const authed = cs && cs.tenantId === tenant.id;
  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number };
  const windowH = pol.cancelWindowGroupHours ?? 3;

  const packages = await db.package.findMany({
    where: { tenantId: tenant.id, active: true, ...(kind === "group" ? { kind: "GROUP" } : kind === "private" ? { kind: "PRIVATE" } : {}) },
    orderBy: [{ kind: "asc" }, { price: "asc" }],
  });

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="packages" brand={brand} />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        {/* Dark hero */}
        <div className="overflow-hidden rounded-3xl px-6 py-14 text-center text-white" style={{ background: "linear-gradient(135deg, #221a12, #171310 60%, #241d14)" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: brand }}>Our packages</div>
          <h1 className="mx-auto mt-3 max-w-[640px] font-display text-[38px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">
            Practice more. Pay less per class.
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-white/70">
            Bundles that move with you. Every credit is valid for the package window — reserve any class with one credit, anytime.
          </p>
        </div>

        {ok === "reserved" && (
          <div className="mt-6 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">
            Package reserved! Pay at the studio on your next visit and your credits activate right away.
          </div>
        )}
        {err && (
          <div className="mt-6 rounded-2xl border border-rose/20 bg-rose/5 px-5 py-4 text-[14px] font-medium text-rose">
            {err === "cancelled" ? "Payment cancelled — no charge was made." : "Online payment didn't go through — try again or reserve and pay at the studio."}
          </div>
        )}
        {ok === "login" && (
          <div className="mt-6 rounded-2xl px-5 py-4 text-[14px] font-semibold" style={{ background: `${brand}14`, color: brand }}>
            <Link href={`/book/${slug}/account`} className="underline">Sign in or create an account</Link> to reserve a package.
          </div>
        )}

        {/* Kind filter */}
        <div className="mt-7 flex justify-center gap-2">
          {([["", "All"], ["group", "Group"], ["private", "Private"]] as const).map(([v, label]) => {
            const active = (kind ?? "") === v;
            return (
              <Link key={v} href={v ? `?kind=${v}` : "?"} className={`rounded-full px-5 py-2 text-[13px] font-bold transition-colors ${active ? "text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`} style={active ? { background: "#17181C" } : undefined}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Cards */}
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: brand }} />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="grid size-11 place-items-center rounded-xl" style={{ background: `${brand}1a`, color: brand }}>
                    <Package className="size-5" />
                  </div>
                  <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: brand }}>
                    {p.kind === "PRIVATE" ? "Private" : "Group"}
                  </span>
                </div>
                <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{p.kind === "PRIVATE" ? "Private classes" : "Group classes"}</div>
                <h2 className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-ink">{p.name}</h2>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-[30px] font-extrabold tracking-tight text-ink">{fmt.format(Number(p.price))}</span>
                  {p.interval !== "none" && <span className="text-[15px] font-bold text-muted">{p.interval === "month" ? "/month" : "/year"}</span>}
                </div>
                <div className="text-[12px] text-muted">≈ {fmt.format(Number(p.price) / Math.max(1, p.credits))} per class</div>
                <ul className="mt-5 space-y-2">
                  {[
                    p.interval !== "none" ? `${p.credits} credits every ${p.interval}` : `${p.credits} class credits`,
                    "Book any class, anytime",
                    `Cancel up to ${windowH} hours before`,
                    p.interval !== "none" ? "Renews automatically — cancel anytime" : `Valid for ${p.validityDays} days`,
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-ink-2">
                      <Check className="size-4 shrink-0" style={{ color: brand }} /> {f}
                    </li>
                  ))}
                </ul>
                {stripeOn && authed && (
                  <form method="post" action="/api/public/stripe/checkout" className="mt-6">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="packageId" value={p.id} />
                    <button className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: brand }}>
                      Pay online now
                    </button>
                  </form>
                )}
                {paypal && authed && (
                  <PayPalPackageButton clientId={paypal.clientId} currency={tenant.currency} slug={slug} packageId={p.id} brand={brand} />
                )}
                <form method="post" action="/api/public/packages" className={stripeOn && authed ? "mt-2" : "mt-6"}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="packageId" value={p.id} />
                  <button className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: brand }}>
                    {authed ? "Reserve — pay at studio" : "Buy now"}
                  </button>
                </form>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="col-span-full py-12 text-center text-sm text-muted">No packages available right now.</p>}
        </div>

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
