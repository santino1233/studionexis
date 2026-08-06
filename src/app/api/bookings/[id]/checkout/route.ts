import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/webhooks";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { initialExpiry } from "@/lib/memberships";
import { guardCap } from "@/lib/rbac-server";

// The calendar's mini-POS: settle an attendee's payment and check them in.
// mode=credit  → consume a package credit
// mode=charge  → cash/transfer/card for the drop-in (+ products, voucher)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const __denied = await guardCap(req, "run_pos");
  if (__denied) return __denied;
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
      } else if (mode === "sellpack") {
        // Sell a package on the spot and pay for this class with its first
        // credit(s) — one action (video spec 2, V2).
        const packageId = String(form.get("packageId") ?? "");
        const method = ["cash", "transfer", "card"].includes(String(form.get("method"))) ? String(form.get("method")) : "cash";
        const pack = await tx.package.findFirst({ where: { id: packageId, tenantId: auth.tenantId, active: true } });
        if (!pack || pack.credits < booking.qty) throw new Error("no-credits");
        const last = await tx.order.findFirst({ where: { tenantId: auth.tenantId }, orderBy: { number: "desc" }, select: { number: true } });
        const order = await tx.order.create({
          data: {
            tenantId: auth.tenantId, clientId: booking.clientId, number: (last?.number ?? 0) + 1,
            total: pack.price, method, status: "PAID",
            items: { create: [{ kind: "package", refId: pack.id, label: pack.name, qty: 1, unitPrice: pack.price }] },
          },
        });
        const cp = await tx.clientPackage.create({
          data: {
            tenantId: auth.tenantId, clientId: booking.clientId, packageId: pack.id,
            creditsLeft: pack.credits - booking.qty, expiresAt: initialExpiry(pack), pricePaid: pack.price,
          },
        });
        await tx.booking.update({
          where: { id },
          data: { status: "CHECKED_IN", paymentMethod: "package_credit", clientPackageId: cp.id, orderId: order.id },
        });
      } else {
        const method = ["cash", "transfer", "card"].includes(String(form.get("method"))) ? String(form.get("method")) : "cash";
        const lines: Array<{ kind: string; refId: string | null; productId: string | null; label: string; qty: number; unitPrice: number }> = [];
        const dropinPrice = Number(booking.session.classType.price);
        let total = dropinPrice * booking.qty;
        lines.push({ kind: "dropin", refId: booking.sessionId, productId: null, label: `${booking.session.classType.name} (drop-in)`, qty: booking.qty, unitPrice: dropinPrice });

        // Optional merch lines: product_<id> (no variants) or variant_<id>.
        for (const [key, val] of form.entries()) {
          const qty = Number(val);
          if (!Number.isFinite(qty) || qty < 1) continue;
          if (key.startsWith("product_")) {
            const prod = await tx.product.findFirst({ where: { id: key.slice(8), tenantId: auth.tenantId, active: true } });
            if (!prod || prod.stock < qty) throw new Error("stock");
            lines.push({ kind: "product", refId: prod.id, productId: prod.id, label: prod.name, qty, unitPrice: Number(prod.price) });
            total += Number(prod.price) * qty;
            await tx.product.update({ where: { id: prod.id }, data: { stock: { decrement: qty } } });
          } else if (key.startsWith("variant_")) {
            const v = await tx.productVariant.findFirst({ where: { id: key.slice(8), product: { tenantId: auth.tenantId, active: true } }, include: { product: true } });
            if (!v || v.stock < qty) throw new Error("stock");
            const unit = Number(v.price ?? v.product.price);
            lines.push({ kind: "product", refId: v.id, productId: v.productId, label: `${v.product.name} — ${v.label}`, qty, unitPrice: unit });
            total += unit * qty;
            await tx.productVariant.update({ where: { id: v.id }, data: { stock: { decrement: qty } } });
          }
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
  const t = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { currency: true } });
  emitEvent(auth.tenantId, "order.paid", { total: "", currency: t?.currency ?? "", label: `checkout — ${booking.session.classType.name}` });
  return NextResponse.redirect(externalUrl(req, `${back}${back.includes("?") ? "&" : "?"}checkout=done`), 303);
}
