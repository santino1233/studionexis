import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Item = { kind: "package" | "product"; refId: string; qty: number };

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { clientId?: string; method?: string; items?: Item[]; voucherCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const voucherCode = String(body.voucherCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const items = (body.items ?? []).filter((i) => i && i.refId && i.qty > 0);
  const method = ["cash", "transfer", "card"].includes(body.method ?? "") ? body.method! : "cash";
  const clientId = body.clientId || null;
  if (items.length === 0) return NextResponse.json({ error: "empty cart" }, { status: 400 });
  if (items.some((i) => i.kind === "package") && !clientId) {
    return NextResponse.json({ error: "packages need a client" }, { status: 400 });
  }

  try {
    const order = await db.$transaction(async (tx) => {
      // Prices always come from the DB, never the client.
      const [packages, products] = await Promise.all([
        tx.package.findMany({ where: { tenantId: auth.tenantId, id: { in: items.filter((i) => i.kind === "package").map((i) => i.refId) } } }),
        tx.product.findMany({ where: { tenantId: auth.tenantId, id: { in: items.filter((i) => i.kind === "product").map((i) => i.refId) } } }),
      ]);
      const pkgMap = new Map(packages.map((p) => [p.id, p]));
      const prodMap = new Map(products.map((p) => [p.id, p]));

      let total = 0;
      const lines: Array<{ kind: string; refId: string; productId: string | null; label: string; qty: number; unitPrice: number }> = [];
      for (const i of items) {
        if (i.kind === "package") {
          const p = pkgMap.get(i.refId);
          if (!p) throw new Error("unknown package");
          lines.push({ kind: "package", refId: p.id, productId: null, label: p.name, qty: i.qty, unitPrice: Number(p.price) });
          total += Number(p.price) * i.qty;
        } else {
          const p = prodMap.get(i.refId);
          if (!p) throw new Error("unknown product");
          if (p.stock < i.qty) throw new Error(`not enough stock: ${p.name}`);
          lines.push({ kind: "product", refId: p.id, productId: p.id, label: p.name, qty: i.qty, unitPrice: Number(p.price) });
          total += Number(p.price) * i.qty;
        }
      }

      // Voucher: validated + consumed inside the transaction.
      let discount = 0;
      let voucherId: string | null = null;
      if (voucherCode) {
        const v = await tx.voucher.findUnique({ where: { tenantId_code: { tenantId: auth.tenantId, code: voucherCode } } });
        if (!v || !v.active) throw new Error("That code isn't valid");
        if (v.expiresAt && v.expiresAt < new Date()) throw new Error("That code has expired");
        if (v.usedCount >= v.maxUses) throw new Error("That code has been fully used");
        discount = Math.min(total, v.type === "PERCENT" ? (total * Number(v.value)) / 100 : Number(v.value));
        voucherId = v.id;
        await tx.voucher.update({ where: { id: v.id }, data: { usedCount: { increment: 1 } } });
      }
      const payable = total - discount;

      const last = await tx.order.findFirst({ where: { tenantId: auth.tenantId }, orderBy: { number: "desc" }, select: { number: true } });
      const order = await tx.order.create({
        data: {
          tenantId: auth.tenantId,
          clientId,
          number: (last?.number ?? 0) + 1,
          total: payable.toFixed(2),
          discount: discount.toFixed(2),
          voucherId,
          method,
          status: "PAID",
          items: { create: lines.map((l) => ({ ...l, unitPrice: l.unitPrice.toFixed(2) })) },
        },
      });

      for (const i of items) {
        if (i.kind === "package") {
          const p = pkgMap.get(i.refId)!;
          for (let n = 0; n < i.qty; n++) {
            await tx.clientPackage.create({
              data: {
                tenantId: auth.tenantId,
                clientId: clientId!,
                packageId: p.id,
                creditsLeft: p.credits,
                expiresAt: new Date(Date.now() + p.validityDays * 86400_000),
                pricePaid: p.price,
              },
            });
          }
        } else {
          await tx.product.update({ where: { id: i.refId }, data: { stock: { decrement: i.qty } } });
        }
      }
      return order;
    });
    return NextResponse.json({ ok: true, orderId: order.id, number: order.number, total: Number(order.total), discount: Number(order.discount) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "checkout failed" }, { status: 400 });
  }
}
