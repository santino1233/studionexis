import { randomInt } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

// ── Gift cards ────────────────────────────────────────────────────────────────
// A gift card is a bearer instrument scoped to one tenant. `balance` is the
// single source of truth; every movement is mirrored in a GiftCardTxn ledger
// row so the running total is always auditable and reconstructable. Redemption
// draws the balance down atomically (never below zero, never twice for the same
// spend) — see redeemGiftCard.

export const GIFT_CARD_MIN = 5; // smallest sellable amount, in the studio's currency
export const GIFT_CARD_MAX = 2000; // cap to keep a single Stripe charge sane
export const GIFT_CARD_VALIDITY_DAYS = 365; // cards expire a year after purchase

// Unambiguous alphabet — no 0/O/1/I/L so a code is easy to read aloud/type.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Human-friendly code like `GIFT-4KPA-7Z3M-QF9T`. */
export function generateGiftCardCode(): string {
  return `GIFT-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Normalise user input (paste, spaces, lowercase) to the canonical form. */
export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

// db can be the PrismaClient or an interactive-transaction client.
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Allocate a code that is unique within the tenant. Retries on the (rare)
 * collision; the caller still relies on the DB unique index as the final guard.
 */
export async function allocateUniqueCode(db: Db, tenantId: string): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateGiftCardCode();
    const clash = await db.giftCard.findFirst({ where: { tenantId, code }, select: { id: true } });
    if (!clash) return code;
  }
  // Fall back to a longer code — collision odds are astronomically low.
  return `GIFT-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

export type RedeemResult =
  | { ok: true; applied: number; balanceAfter: number; giftCardId: string; code: string }
  | { ok: false; reason: "not_found" | "inactive" | "expired" | "empty" };

/**
 * Draw `requested` off a gift card, atomically, inside an existing
 * transaction. Partial redemption is supported: we apply min(requested,
 * balance) and return how much was actually applied.
 *
 * Double-spend / race safety: the decrement is a conditional updateMany with
 * `balance >= applied` in the WHERE clause. Postgres takes a row lock for the
 * UPDATE, so two concurrent redemptions serialise; the second one re-reads the
 * now-lower balance (via the guard) and can never drive the balance negative
 * or apply more than exists. If the guarded update touches 0 rows we abort.
 */
export async function redeemGiftCard(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; code: string; requested: number; bookingId?: string | null; note?: string },
): Promise<RedeemResult> {
  const code = normaliseCode(args.code);
  const card = await tx.giftCard.findFirst({ where: { tenantId: args.tenantId, code } });
  if (!card) return { ok: false, reason: "not_found" };
  if (card.status !== "ACTIVE") return { ok: false, reason: "inactive" };
  if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
    await tx.giftCard.update({ where: { id: card.id }, data: { status: "EXPIRED" } });
    return { ok: false, reason: "expired" };
  }

  const balance = Number(card.balance);
  if (balance <= 0) return { ok: false, reason: "empty" };

  const applied = Math.min(Math.max(0, args.requested), balance);
  if (applied <= 0) return { ok: false, reason: "empty" };

  // Guarded, atomic decrement — only succeeds while the balance still covers it.
  const updated = await tx.giftCard.updateMany({
    where: { id: card.id, status: "ACTIVE", balance: { gte: applied.toFixed(2) } },
    data: { balance: { decrement: applied.toFixed(2) } },
  });
  if (updated.count !== 1) {
    // Lost the race — someone else spent it first. Caller should retry/refuse.
    return { ok: false, reason: "empty" };
  }

  const balanceAfter = Number((balance - applied).toFixed(2));
  await tx.giftCardTxn.create({
    data: {
      giftCardId: card.id,
      amount: (-applied).toFixed(2),
      type: "REDEEM",
      bookingId: args.bookingId ?? null,
      note: args.note ?? null,
    },
  });
  // Fully-spent cards flip to REDEEMED so they drop out of "active" lists.
  if (balanceAfter <= 0) {
    await tx.giftCard.update({ where: { id: card.id }, data: { status: "REDEEMED" } });
  }

  return { ok: true, applied, balanceAfter, giftCardId: card.id, code };
}

/** Plain-text purchase email (the mailer sends text/plain only). */
export function purchaseEmailBody(args: {
  studio: string;
  amount: string; // pre-formatted with currency
  code: string;
  message?: string | null;
  viewUrl?: string;
}): { subject: string; body: string } {
  const lines = [
    `You've received a ${args.studio} gift card!`,
    "",
    `Amount: ${args.amount}`,
    `Gift code: ${args.code}`,
  ];
  if (args.message) lines.push("", `Message: "${args.message}"`);
  if (args.viewUrl) lines.push("", `View & redeem your gift card: ${args.viewUrl}`);
  lines.push(
    "",
    "Present this code (or the QR on the link above) at the studio, or enter it at",
    "checkout to draw down the balance. Enjoy!",
    "",
    `— ${args.studio}`,
  );
  return { subject: `Your ${args.studio} gift card`, body: lines.join("\n") };
}

export function giftCardStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE": return "Active";
    case "REDEEMED": return "Fully redeemed";
    case "VOID": return "Voided";
    case "EXPIRED": return "Expired";
    default: return status;
  }
}
