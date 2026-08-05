import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { externalUrl } from "@/lib/request-url";
import { allocateUniqueCode, GIFT_CARD_MAX, GIFT_CARD_VALIDITY_DAYS } from "@/lib/gift-cards";

// Admin gift-card management: issue a new card, adjust its balance, or void it.
// Front-desk (STAFF) and above may issue/adjust; INSTRUCTOR is denied via access.
export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);
  if (!canAccess(auth.role, "/gift-cards")) return NextResponse.redirect(externalUrl(req, "/dashboard"), 303);

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const back = (q: string) => NextResponse.redirect(externalUrl(req, `/gift-cards${q}`), 303);

  try {
    if (action === "issue") {
      const amount = Math.round((Number(form.get("amount") ?? 0) || 0) * 100) / 100;
      if (amount <= 0 || amount > GIFT_CARD_MAX) return back("?err=amount");
      const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
      const code = await allocateUniqueCode(db, tenant.id);
      const expiresAt = new Date(Date.now() + GIFT_CARD_VALIDITY_DAYS * 86400_000);
      await db.$transaction(async (tx) => {
        const card = await tx.giftCard.create({
          data: {
            tenantId: tenant.id,
            code,
            initialAmount: amount.toFixed(2),
            balance: amount.toFixed(2),
            currency: tenant.currency,
            purchaserEmail: String(form.get("purchaserEmail") ?? "").trim() || null,
            recipientEmail: String(form.get("recipientEmail") ?? "").trim() || null,
            message: String(form.get("message") ?? "").trim() || null,
            status: "ACTIVE",
            expiresAt,
          },
        });
        await tx.giftCardTxn.create({
          data: { giftCardId: card.id, amount: amount.toFixed(2), type: "PURCHASE", note: "Issued by staff" },
        });
      });
      return back(`?ok=issued&code=${encodeURIComponent(code)}`);
    }

    if (action === "adjust") {
      const id = String(form.get("id") ?? "");
      const delta = Math.round((Number(form.get("delta") ?? 0) || 0) * 100) / 100;
      if (!id || delta === 0) return back("?err=adjust");
      const card = await db.giftCard.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!card) return back("?err=notfound");
      const balance = Number(card.balance);
      const newBalance = Math.round((balance + delta) * 100) / 100;
      if (newBalance < 0) return back("?err=negative");
      await db.$transaction(async (tx) => {
        await tx.giftCard.update({
          where: { id: card.id },
          data: {
            balance: newBalance.toFixed(2),
            // Re-activate a spent card if credit is added back.
            status: card.status === "REDEEMED" && newBalance > 0 ? "ACTIVE" : card.status,
          },
        });
        await tx.giftCardTxn.create({
          data: { giftCardId: card.id, amount: delta.toFixed(2), type: "ADJUST", note: String(form.get("note") ?? "").trim() || "Manual adjustment" },
        });
      });
      return back("?ok=adjusted");
    }

    if (action === "void") {
      const id = String(form.get("id") ?? "");
      const card = await db.giftCard.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!card) return back("?err=notfound");
      await db.$transaction(async (tx) => {
        await tx.giftCard.update({ where: { id: card.id }, data: { status: "VOID" } });
        await tx.giftCardTxn.create({ data: { giftCardId: card.id, amount: "0.00", type: "ADJUST", note: "Voided by staff" } });
      });
      return back("?ok=voided");
    }

    return back("?err=action");
  } catch {
    return back("?err=server");
  }
}
