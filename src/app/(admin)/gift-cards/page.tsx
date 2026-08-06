import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant, moneyFormatter } from "@/lib/tenant";
import { giftCardStatusLabel, GIFT_CARD_MAX } from "@/lib/gift-cards";
import { Prisma } from "@prisma/client";
import { Gift } from "lucide-react";

export const dynamic = "force-dynamic";

const field = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
const microLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-wash text-green",
  REDEEMED: "bg-line-2 text-ink-2",
  VOID: "bg-rose/10 text-rose",
  EXPIRED: "bg-line-2 text-muted",
};

export default async function GiftCardsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; ok?: string; err?: string; code?: string }>;
}) {
  const { q, ok, err, code } = await searchParams;
  const tenant = await getCurrentTenant();
  const fmt = moneyFormatter(tenant.currency);
  const query = (q ?? "").trim();

  const where: Prisma.GiftCardWhereInput = {
    tenantId: tenant.id,
    ...(query
      ? {
          OR: [
            { code: { contains: query, mode: "insensitive" } },
            { recipientEmail: { contains: query, mode: "insensitive" } },
            { purchaserEmail: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [cards, agg] = await Promise.all([
    db.giftCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { txns: { orderBy: { createdAt: "desc" }, take: 50 } },
    }),
    db.giftCard.aggregate({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      _sum: { balance: true },
      _count: true,
    }),
  ]);

  const outstanding = Number(agg._sum.balance ?? 0);

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Gift Cards</h1>
      <p className="mt-1 text-sm text-muted">Sell, track and redeem gift cards. Balances are the source of truth and every movement is logged.</p>

      {ok && (
        <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">
          {ok === "issued" ? <>Gift card issued{code ? <> — code <b className="font-mono">{code}</b></> : null}.</>
            : ok === "adjusted" ? "Balance adjusted." : ok === "voided" ? "Gift card voided." : "Done."}
        </div>
      )}
      {err && (
        <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
          {err === "amount" ? `Enter an amount between 0 and ${GIFT_CARD_MAX}.`
            : err === "negative" ? "That adjustment would take the balance below zero."
            : err === "notfound" ? "Gift card not found."
            : "Something went wrong — please try again."}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Summary + list */}
        <Card className="lg:col-span-2">
          <CardHeader
            eyebrow="Outstanding liability"
            title={`${fmt.format(outstanding)} across ${agg._count} active card${agg._count === 1 ? "" : "s"}`}
            sub="What your studio still owes on unspent gift cards"
            action={
              <form method="get" className="flex items-center gap-2">
                <input name="q" defaultValue={query} placeholder="Search code or email" className={`${field} w-[220px]`} />
                <button className="h-10 rounded-[10px] bg-brand px-3.5 text-[13px] font-bold text-white hover:opacity-90">Search</button>
              </form>
            }
          />
          <div className="divide-y divide-line-2">
            {cards.map((c) => {
              const spent = Number(c.initialAmount) - Number(c.balance);
              return (
                <details key={c.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-[18px] py-[13px] hover:bg-raised">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-wash text-brand"><Gift className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] font-semibold text-ink">{c.code}</span>
                      <span className="block truncate text-[12px] text-muted">{c.recipientEmail || c.purchaserEmail || "—"} · issued {c.createdAt.toISOString().slice(0, 10)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[14px] font-bold text-ink">{fmt.format(Number(c.balance))}</span>
                      <span className="block text-[11px] text-muted">of {fmt.format(Number(c.initialAmount))}</span>
                    </span>
                    <span className={`ml-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[c.status] ?? "bg-line-2 text-ink-2"}`}>{giftCardStatusLabel(c.status)}</span>
                  </summary>
                  <div className="border-t border-line-2 bg-raised/40 px-[18px] py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Ledger */}
                      <div>
                        <div className={microLabel}>Ledger ({fmt.format(spent)} spent)</div>
                        <ul className="space-y-1.5">
                          {c.txns.map((t) => (
                            <li key={t.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                              <span className="text-ink-2">
                                <span className="inline-block w-16 font-bold uppercase text-[10px] tracking-wide text-muted">{t.type}</span>
                                {t.note ? <span className="text-muted"> {t.note}</span> : null}
                              </span>
                              <span className={`font-mono font-semibold ${Number(t.amount) < 0 ? "text-rose" : "text-green"}`}>
                                {Number(t.amount) < 0 ? "" : "+"}{fmt.format(Number(t.amount))}
                              </span>
                            </li>
                          ))}
                          {c.txns.length === 0 && <li className="text-[12.5px] text-muted">No movements yet.</li>}
                        </ul>
                      </div>
                      {/* Actions */}
                      <div className="space-y-3">
                        {c.message && <p className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-[12.5px] italic text-ink-2">“{c.message}”</p>}
                        {c.status !== "VOID" && (
                          <form method="post" action="/api/gift-cards" className="flex items-end gap-2">
                            <input type="hidden" name="action" value="adjust" />
                            <input type="hidden" name="id" value={c.id} />
                            <div className="flex-1">
                              <label className={microLabel}>Adjust balance (±)</label>
                              <input name="delta" type="number" step="0.01" placeholder="e.g. 10 or -5" className={`${field} w-full`} />
                            </div>
                            <button className="h-10 shrink-0 rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-bold text-ink hover:bg-line-2">Apply</button>
                          </form>
                        )}
                        {c.status !== "VOID" && (
                          <form method="post" action="/api/gift-cards">
                            <input type="hidden" name="action" value="void" />
                            <input type="hidden" name="id" value={c.id} />
                            <button className="text-[12.5px] font-bold text-rose hover:underline">Void this card</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
            {cards.length === 0 && <div className="px-[18px] py-12 text-center text-sm text-muted">{query ? "No gift cards match your search." : "No gift cards yet — issue one, or let clients buy them from your booking page."}</div>}
          </div>
        </Card>

        {/* Issue */}
        <Card>
          <CardHeader title="Issue a gift card" sub="Comp a client or record an in-person sale" />
          <form method="post" action="/api/gift-cards" className="space-y-3.5 p-5">
            <input type="hidden" name="action" value="issue" />
            <div>
              <label className={microLabel}>Amount ({tenant.currency})</label>
              <input name="amount" type="number" step="0.01" min={1} max={GIFT_CARD_MAX} required placeholder="50.00" className={`${field} w-full`} />
            </div>
            <div>
              <label className={microLabel}>Recipient email (optional)</label>
              <input name="recipientEmail" type="email" placeholder="friend@example.com" className={`${field} w-full`} />
            </div>
            <div>
              <label className={microLabel}>Purchaser email (optional)</label>
              <input name="purchaserEmail" type="email" placeholder="buyer@example.com" className={`${field} w-full`} />
            </div>
            <div>
              <label className={microLabel}>Message (optional)</label>
              <textarea name="message" rows={2} maxLength={500} placeholder="Happy birthday!" className={`${field} w-full py-2`} />
            </div>
            <button className="h-10 w-full rounded-[10px] bg-brand text-[14px] font-bold text-white hover:opacity-90">Issue card</button>
            <p className="text-[11.5px] text-muted">A unique code is generated automatically. Redeem it at the Point of Sale by entering the code.</p>
          </form>
        </Card>
      </div>
    </div>
  );
}
