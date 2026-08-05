import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { moneyFormatter } from "@/lib/tenant";
import { normaliseCode, giftCardStatusLabel } from "@/lib/gift-cards";

// Public "check my gift-card balance" lookup, scoped to one tenant. Rate-limited
// and returns only non-sensitive fields (never purchaser/recipient email).
export async function POST(req: Request) {
  if (!rateLimit(req, "gc-balance", 15, 60)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  let body: { slug?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const tenant = await tenantBySlugOrDomain(String(body.slug ?? ""));
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const code = normaliseCode(String(body.code ?? ""));
  if (!code) return NextResponse.json({ error: "no_code" }, { status: 400 });

  const card = await db.giftCard.findFirst({
    where: { tenantId: tenant.id, code },
    select: { balance: true, initialAmount: true, currency: true, status: true, expiresAt: true },
  });
  if (!card) return NextResponse.json({ found: false });

  const fmt = moneyFormatter(card.currency);
  const expired = !!card.expiresAt && card.expiresAt.getTime() < Date.now();
  return NextResponse.json({
    found: true,
    status: expired && card.status === "ACTIVE" ? "EXPIRED" : card.status,
    statusLabel: expired && card.status === "ACTIVE" ? "Expired" : giftCardStatusLabel(card.status),
    balance: Number(card.balance),
    balanceLabel: fmt.format(Number(card.balance)),
    initialLabel: fmt.format(Number(card.initialAmount)),
    expiresAt: card.expiresAt,
  });
}
