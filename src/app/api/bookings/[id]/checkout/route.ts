import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

// The calendar's mini-POS: settle an attendee's payment and check them in.
// mode=credit  → consume a package credit
// mode=charge  → cash/transfer/card for the drop-in (+ products, voucher)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const mode = String(form.get("mode") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : "/schedule";
  const fail = (code: string) =>
    NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}checkout=${code}`), 303);

  const booking = await db.booking.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { session: { include: { classType: true } } },
  });
  if (!booking || !["BOOKED", "CHECKED_IN"].includes(booking.status)) return fail("gone");

  try {
    await db.$transaction(async (tx) => {
      if (mode === "credit") {
        const pkg = await tx.clientPackage.findFirst({
          where: { tenantId: auth.tenantId, clientId: booking.clientId, creditsLeft: { gte: booking.qty }, frozen: false, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        });
        if (!pkg) throw new Error("no-credits");
        // Don't double-spend if the booking already consumed its credits.
        if (!booking.clientPackageId) {
          await tx.clientPackage.update({ where: { id: pkg.id }, data: { creditsLeft: { decrement: booking.qty } } });
        }
        await tx.booking.update({
          where: { id },
          data: { status: "CHECKED_IN", paymentMethod: "package_credit", clientPackageId: booking.clientPackageId ?? pkg.id },
        });
      } else {
        const method = ["cash", "transfer", "card"].includes(String(form.get("method"))) ? String(form.get("method")) : "cash";
        const lines: Array<{ kind: string; refId: string | null; productId: string | null; label: string; qty: number; unitPrice: number }> = [];
        const dropinPrice = Number(booking.session.classType.price);
        let total = dropinPrice * booking.qty;
        lines.push({ kind: "dropin", refId: booking.sessionId, productId: null, label: `${booking.session.classType.name} (drop-in)`, qty: booking.qty, unitPrice: dropinPrice });

        // Optional merch lines: fields named product_<id> hold quantities.
        for (const [key, val] of form.entries()) {
          if (!key.startsWith("product_")) continue;
          const qty = Number(val);
          if (!Number.isFinite(qty) || qty < 1) continue;
          const prod = await tx.product.findFirst({ where: { id: key.slice(8), tenantId: auth.tenantId, active: true } });
          if (!prod || prod.stock < qty) throw new Error("stock");
          lines.push({ kind: "product", refId: prod.id, productId: prod.id, label: prod.name, qty, unitPrice: Number(prod.price) });
          total += Number(prod.price) * qty;
          await tx.product.update({ where: { id: prod.id }, data: { stock: { decrement: qty } } });
        }

        // Voucher (same rules as the main POS)
        let discount = 0;
        let voucherId: string | null = null;
        const code = String(form.get("voucherCode") ?? "").trim().toUpperCase().replace(/\s+/g, "");
        if (code) {
          const v = await tx.voucher.findUnique({ where: { tenantId_code: { tenantId: auth.tenantId, code } } });
          if (!v || !v.active || (v.expiresAt && v.expiresAt < new Date()) || v.usedCount >= v.maxUses) throw new Error("voucher");
          discount = Math.min(total, v.type === "PERCENT" ? (total * Number(v.value)) / 100 : Number(v.value));
          voucherId = v.id;
          await tx.voucher.update({ where: { id: v.id }, data: { usedCount: { increment: 1 } } });
        }

        const last = await tx.order.findFirst({ where: { tenantId: auth.tenantId }, orderBy: { number: "desc" }, select: { number: true } });
        const order = await tx.order.create({
          data: {
            tenantId: auth.tenantId,
            clientId: booking.clientId,
            number: (last?.number ?? 0) + 1,
            total: (total - discount).toFixed(2),
            discount: discount.toFixed(2),
            voucherId,
            method,
            status: "PAID",
            items: { create: lines.map((l) => ({ ...l, unitPrice: l.unitPrice.toFixed(2) })) },
          },
        });
        await tx.booking.update({
          where: { id },
          data: { status: "CHECKED_IN", paymentMethod: method, orderId: order.id },
        });
      }
      await tx.client.update({ where: { id: booking.clientId }, data: { lastVisitAt: new Date() } });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return fail(["no-credits", "stock", "voucher"].includes(msg) ? msg : "failed");
  }
  return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}checkout=done`), 303);
}
