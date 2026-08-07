import Link from "next/link";
import { ArrowLeft, Check, Clock, Palette, Rocket, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { platformStripe } from "@/lib/stripe";
import { CUSTOM_SITE_PRICE_USD } from "@/app/api/custom-site/route";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const area = "w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-blue-wash text-blue",
  IN_PROGRESS: "bg-brand-wash text-brand",
  DELIVERED: "bg-green-wash text-green",
};
const STATUS_LABEL: Record<string, string> = { NEW: "Received", IN_PROGRESS: "In progress", DELIVERED: "Delivered" };

// "We build it for you" — done-for-you website offer ($99 / 3 days).
// Charged on Nexis HQ's own Stripe (platform account), NOT the studio's key.
export default async function CustomSitePage({ searchParams }: {
  searchParams: Promise<{ paid?: string; cancelled?: string; error?: string }>;
}) {
  const { paid, cancelled, error } = await searchParams;
  const tenant = await getCurrentTenant();
  const available = !!platformStripe();

  const orders = await db.customSiteOrder.findMany({
    where: { tenantId: tenant.id, amountPaid: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const errText =
    error === "unavailable" ? "Online purchase isn't switched on yet — contact us and we'll set it up for you."
    : error === "contact" ? "Please add your name and email so we can reach you."
    : error === "stripe" ? "We couldn't start checkout. Please try again in a moment."
    : null;

  return (
    <div className="mx-auto max-w-[860px]">
      <Link href="/website" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Back to Website</Link>

      <div className="mt-3 overflow-hidden rounded-3xl border border-line-2 bg-gradient-to-br from-brand/10 via-surface to-surface p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"><Sparkles className="size-3.5" /> Done for you</div>
        <h1 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-ink">We'll build your website — in 3 days</h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink-2">
          No time to fiddle with the builder? Our team designs and builds your studio site for you — hero, classes,
          schedule, gallery and contact — polished and ready to share. One flat fee, no subscription.
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-[40px] font-extrabold text-ink">${CUSTOM_SITE_PRICE_USD}</span>
          <span className="text-[13px] font-bold text-muted">one-off · delivered in 3 business days</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          [Palette, "Your brand", "We match your colours, logo and voice across every section."],
          [Rocket, "Fully built", "Hero, classes, schedule embed, gallery, contact — all done."],
          [Clock, "3-day turnaround", "A live, review-ready site within three business days."],
        ].map(([Icon, t, d], i) => (
          <div key={i} className="rounded-2xl border border-line-2 bg-surface p-4">
            {(() => { const C = Icon as React.ComponentType<{ className?: string }>; return <C className="size-5 text-brand" />; })()}
            <div className="mt-2 text-[13.5px] font-bold text-ink">{t as string}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{d as string}</div>
          </div>
        ))}
      </div>

      {paid && <div className="mt-5 rounded-xl border border-green/20 bg-green-wash px-4 py-3 text-[13.5px] font-medium text-green"><Check className="mr-1 inline size-4 -mt-0.5" /> Payment received — thank you! Our team is on it and will reach out within one business day.</div>}
      {cancelled && <div className="mt-5 rounded-xl border border-line-2 bg-surface px-4 py-3 text-[13.5px] text-ink-2">Checkout cancelled — no charge was made. Your brief is below whenever you're ready.</div>}
      {errText && <div className="mt-5 rounded-xl border border-rose/20 bg-rose/5 px-4 py-3 text-[13.5px] font-medium text-rose">{errText}</div>}

      {orders.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Your custom-site orders" sub="Track what our team is building for you" />
          <ul className="divide-y divide-line-2">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">Custom website — ${Number(o.amountPaid).toFixed(0)}</span>
                  <span className="text-[11.5px] text-muted">Ordered {o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${STATUS_TONE[o.status] ?? "bg-line-2 text-ink-2"}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader title="Tell us about your studio" sub="The more you share, the closer the first draft lands" />
        {available ? (
          <form method="post" action="/api/custom-site" className="space-y-4 p-5 pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div><label className={label}>Your name</label><input name="name" required className={field} placeholder="Jordan Lee" /></div>
              <div><label className={label}>Email</label><input name="email" type="email" required className={field} placeholder="you@studio.com" /></div>
              <div><label className={label}>Phone (optional)</label><input name="phone" className={field} placeholder="+66…" /></div>
            </div>
            <div><label className={label}>Studio / business name</label><input name="businessName" defaultValue={tenant.name} className={field} /></div>
            <div><label className={label}>What should the site achieve?</label><textarea name="goals" rows={3} className={area} placeholder="Fill classes, sell intro packages, look premium, rank locally…" /></div>
            <div><label className={label}>Look & feel you want</label><textarea name="style" rows={2} className={area} placeholder="Calm and minimal? Bold and energetic? Any colours or fonts you love." /></div>
            <div><label className={label}>Reference sites you like (links)</label><textarea name="references" rows={2} className={area} placeholder="Paste a few URLs — yours or ones you admire." /></div>
            <div><label className={label}>Brand assets — logo, photos (links)</label><textarea name="brandAssets" rows={2} className={area} placeholder="Google Drive / Dropbox link, or note that you'll email them." /></div>
            <div><label className={label}>Anything else</label><textarea name="extra" rows={2} className={area} placeholder="Opening hours, must-have sections, deadlines…" /></div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line-2 bg-canvas px-4 py-3">
              <span className="text-[12.5px] text-muted">You'll be taken to secure Stripe checkout. No charge until you confirm.</span>
              <button className="shrink-0 rounded-xl bg-brand px-6 py-3 text-[14px] font-bold text-white hover:bg-brand-ink">Pay ${CUSTOM_SITE_PRICE_USD} & submit brief →</button>
            </div>
          </form>
        ) : (
          <div className="p-5 pt-0">
            <div className="rounded-xl border border-line-2 bg-canvas px-4 py-5 text-center">
              <div className="text-[14px] font-bold text-ink">Online checkout is being set up</div>
              <p className="mx-auto mt-1 max-w-[440px] text-[13px] text-muted">The done-for-you website is available — we just can't take card payment here yet. Reach out via <Link href="/support" className="font-bold text-brand hover:underline">Support</Link> and we'll get you started right away.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
