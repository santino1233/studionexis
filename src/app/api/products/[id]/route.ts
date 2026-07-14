import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  } else if (action === "archive") {
    await db.product.update({ where: { id }, data: { active: false } });
  } else if (action === "restore") {
    await db.product.update({ where: { id }, data: { active: true } });
  }
  return NextResponse.redirect(externalUrl(req, `/products?saved=1${action === "restore" || (action === "archive" && !product.active) ? "&archived=1" : ""}`), 303);
}
