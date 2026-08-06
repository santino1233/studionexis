import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const __denied = await guardCap(req, "manage_products");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const product = await db.product.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!product) return NextResponse.redirect(externalUrl(req, "/products"), 303);

  if (action === "update") {
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("price"));
    const stock = Number(form.get("stock"));
    await db.product.update({
      where: { id },
      data: {
        name: name || product.name,
        price: (Number.isFinite(price) && price >= 0 ? price : Number(product.price)).toFixed(2),
        stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : product.stock,
      },
    });
  } else if (action === "restock") {
    const qty = Math.floor(Number(form.get("qty")));
    if (Number.isFinite(qty) && qty > 0) {
      await db.product.update({ where: { id }, data: { stock: { increment: qty } } });
    }
  } else if (action === "variant-add") {
    const label = String(form.get("label") ?? "").trim().slice(0, 60);
    const price = Number(form.get("vprice"));
    const stock = Math.max(0, Math.floor(Number(form.get("vstock")) || 0));
    if (label) {
      await db.productVariant.create({
        data: { productId: id, label, price: Number.isFinite(price) && price > 0 ? price.toFixed(2) : null, stock },
      });
    }
  } else if (action === "variant-update") {
    const vid = String(form.get("vid") ?? "");
    if (form.get("_remove")) {
      await db.productVariant.deleteMany({ where: { id: vid, productId: id } });
      return NextResponse.redirect(externalUrl(req, "/products?saved=1"), 303);
    }
    const v = await db.productVariant.findFirst({ where: { id: vid, productId: id } });
    if (v) {
      const price = Number(form.get("vprice"));
      const stock = Number(form.get("vstock"));
      await db.productVariant.update({
        where: { id: vid },
        data: {
          label: String(form.get("label") ?? "").trim().slice(0, 60) || v.label,
          price: Number.isFinite(price) && price > 0 ? price.toFixed(2) : null,
          stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : v.stock,
        },
      });
    }
  } else if (action === "variant-remove") {
    await db.productVariant.deleteMany({ where: { id: String(form.get("vid") ?? ""), productId: id } });
  } else if (action === "archive") {
    await db.product.update({ where: { id }, data: { active: false } });
  } else if (action === "restore") {
    await db.product.update({ where: { id }, data: { active: true } });
  }
  return NextResponse.redirect(externalUrl(req, `/products?saved=1${action === "restore" || (action === "archive" && !product.active) ? "&archived=1" : ""}`), 303);
}
