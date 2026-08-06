import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { moneyFormatter } from "@/lib/tenant";
import { qrSvg } from "@/lib/qr";
import { normaliseCode, giftCardStatusLabel } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

// A recipient's view of a single gift card: amount, live balance, personal
// message and a scannable QR (generated server-side, no network). The URL is
// the code — the card is a bearer instrument, so possession of the code is the
// credential, exactly like a physical gift card.
export default async function GiftCardViewPage({ params, searchParams }: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { slug, code } = await params;
  const { ok } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant) notFound();
  const brand = tenant.brandColor || "#F97316";
  const fmt = moneyFormatter(tenant.currency);

  const card = await db.giftCard.findFirst({ where: { tenantId: tenant.id, code: normaliseCode(decodeURIComponent(code)) } });
  if (!card) notFound();

  const expired = !!card.expiresAt && card.expiresAt.getTime() < Date.now();
  const statusLabel = expired && card.status === "ACTIVE" ? "Expired" : giftCardStatusLabel(card.status);
  const svg = qrSvg(card.code, { size: 200, border: 3 });

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-[560px] px-4 py-10 sm:px-6">
        {ok === "purchased" && (
          <div className="mb-5 rounded-2xl border border-green/20 bg-green-wash px-5 py-4 text-center text-[14px] font-bold text-green">Your gift card is ready. Save this page or screenshot the QR.</div>
        )}
        <div className="overflow-hidden rounded-3xl border border-line-2 shadow-[var(--shadow-card)]">
          {/* Header band */}
          <div className="px-7 py-8 text-white" style={{ background: `linear-gradient(135deg, ${brand}, #171310 130%)` }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/80"><Gift className="size-4" /> Gift card</div>
            <div className="mt-4 font-display text-[15px] font-bold">{tenant.name}</div>
            <div className="mt-1 font-display text-[44px] font-extrabold leading-none tracking-tight">{fmt.format(Number(card.balance))}</div>
            <div className="mt-1 text-[12.5px] text-white/70">balance{Number(card.balance) !== Number(card.initialAmount) ? ` · originally ${fmt.format(Number(card.initialAmount))}` : ""}</div>
          </div>
          {/* Body */}
          <div className="bg-surface px-7 py-7">
            {card.message && <p className="mb-5 rounded-xl border border-line-2 bg-raised px-4 py-3 text-[14px] italic text-ink-2">“{card.message}”</p>}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="min-w-0 text-center sm:text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Redeem code</div>
                <div className="mt-1 break-all font-mono text-[18px] font-bold text-ink">{card.code}</div>
                <div className="mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: card.status === "ACTIVE" && !expired ? "var(--green-wash, #ecfdf5)" : "#f1f1f4", color: card.status === "ACTIVE" && !expired ? "#059669" : "#6b7280" }}>{statusLabel}</div>
                {card.expiresAt && <div className="mt-2 text-[12px] text-muted">{expired ? "Expired" : "Valid until"} {card.expiresAt.toISOString().slice(0, 10)}</div>}
              </div>
            </div>
            <p className="mt-6 text-center text-[12.5px] leading-relaxed text-muted">Present this QR or read out the code at {tenant.name}, or enter it at checkout. You can use it across multiple visits until the balance runs out.</p>
          </div>
        </div>
        <footer className="mt-8 text-center text-[11.5px] text-muted">
          <Link href={`/book/${slug}/gift-cards`} className="hover:text-ink">Buy another gift card</Link>
          <span className="mx-2">·</span>
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
