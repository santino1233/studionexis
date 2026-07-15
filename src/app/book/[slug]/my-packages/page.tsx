import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerNav } from "@/components/customer/nav";

export const dynamic = "force-dynamic";

export default async function MyPackagesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; ok?: string }>;
}) {
  const { slug } = await params;
  const { t, ok } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const cs = await getCustomerSession();
  if (!cs || cs.tenantId !== tenant.id) {
    return (
      <div className="min-h-screen bg-canvas">
        <CustomerNav slug={slug} active="my-packages" brand={brand} />
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center">
          <h1 className="font-display text-[24px] font-extrabold text-ink">Sign in to see your packages</h1>
          <Link href={`/book/${slug}/account`} className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: brand }}>Sign in</Link>
        </main>
      </div>
    );
  }

  const [packages, usage, pendingOrders] = await Promise.all([
    db.clientPackage.findMany({ where: { tenantId: tenant.id, clientId: cs.clientId }, include: { package: true }, orderBy: { createdAt: "desc" } }),
    db.booking.findMany({
      where: { tenantId: tenant.id, clientId: cs.clientId, clientPackageId: { not: null }, status: { in: ["BOOKED", "CHECKED_IN"] } },
      include: { session: { include: { classType: true } }, clientPackage: { include: { package: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.order.findMany({ where: { tenantId: tenant.id, clientId: cs.clientId, status: "PENDING" }, include: { items: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const now = new Date();
  const tab = t === "usage" ? "usage" : "packages";

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="my-packages" brand={brand} />
      <main className="mx-auto max-w-[860px] px-4 py-8 sm:px-6">
        {ok === "paid" && (
          <div className="mb-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-[14px] font-bold text-green">
            🎉 Payment received — your credits are active and ready to book.
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">My Packages</h1>
            <p className="mt-1 text-sm text-muted">Track your credits and validity.</p>
          </div>
          <Link href={`/book/${slug}/packages`} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: "#17181C" }}>Buy More</Link>
        </div>

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-line-2 p-1">
          {([["packages", `Packages`, packages.length], ["usage", "Recent Usage", usage.length]] as const).map(([key, label, n]) => (
            <Link key={key} href={`?t=${key}`}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-bold transition-colors ${tab === key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <span style={tab === key ? { color: brand } : undefined}>{label}</span>
              {key === "packages" && n > 0 && <span className="grid size-5 place-items-center rounded-full text-[10.5px] font-bold text-white" style={{ background: brand }}>{n}</span>}
            </Link>
          ))}
        </div>

        {pendingOrders.length > 0 && (
          <div className="mt-5 rounded-2xl px-5 py-4 text-[13.5px] font-semibold" style={{ background: `${brand}14`, color: brand }}>
            {pendingOrders.length === 1
              ? `Reserved: ${pendingOrders[0].items[0]?.label ?? "a package"} — pay at the studio to activate your credits.`
              : `${pendingOrders.length} reserved packages — pay at the studio to activate.`}
          </div>
        )}

        {tab === "packages" ? (
          <div className="mt-6 space-y-4">
            {packages.map((p) => {
              const total = p.package.credits;
              const used = Math.max(0, total - p.creditsLeft);
              const expired = p.expiresAt <= now;
              const active = !expired && p.creditsLeft > 0 && !p.frozen;
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl text-white shadow-[var(--shadow-card)]" style={{ background: "linear-gradient(135deg, #201a13, #16130f 55%, #241d14)", border: `1px solid ${active ? brand + "55" : "#2b2b2b"}` }}>
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{p.package.kind === "PRIVATE" ? "Private" : "Group"}</span>
                      {p.package.interval !== "none" && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${brand}33`, color: brand }}>Renews {p.package.interval}ly</span>}
                      <span className="text-[13.5px] font-bold">{p.creditsLeft} / {total} Credits Remaining</span>
                    </div>
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${active ? "bg-green/15 text-green" : p.frozen ? "bg-blue/15 text-blue" : "bg-white/10 text-white/50"}`}>
                      <span className={`size-1.5 rounded-full ${active ? "bg-green" : p.frozen ? "bg-blue" : "bg-white/40"}`} />
                      {active ? "Active" : p.frozen ? "Frozen" : expired ? "Expired" : "Used up"}
                    </span>
                  </div>
                  <div className="px-5 py-5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/70">
                      <Tag className="size-3" /> PKG-{p.id.slice(-8)}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-[44px] font-extrabold leading-none">{p.creditsLeft}</span>
                      <span className="text-[15px] text-white/50">/ {total}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-white/60">Credits Remaining</div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${total ? (p.creditsLeft / total) * 100 : 0}%`, background: brand }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-white/50">
                      <span>{used} credit{used === 1 ? "" : "s"} used</span><span>{total} total</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Purchased</div>
                        <div className="mt-0.5 text-[13.5px] font-bold">{p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Valid until</div>
                        <div className="mt-0.5 text-[13.5px] font-bold">{p.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {packages.length === 0 && (
              <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
                No packages yet — <Link href={`/book/${slug}/packages`} className="font-bold" style={{ color: brand }}>browse packages</Link>.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {usage.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-2xl border border-line-2 bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{b.session.classType.name}</div>
                  <div className="text-[11.5px] text-muted">
                    {b.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric", year: "numeric" })}
                    {" · "}{b.clientPackage?.package.name}
                  </div>
                </div>
                <span className="font-display text-[15px] font-extrabold text-rose">−1</span>
              </div>
            ))}
            {usage.length === 0 && (
              <div className="rounded-2xl border border-line-2 bg-surface p-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">No credit usage yet.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
