import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { initialExpiry } from "@/lib/memberships";

// Staff marks a PENDING (reserved-online) order as paid at the desk;
// that's the moment package credits are granted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  const action = String((await req.formData()).get("action") ?? "");
  if (action !== "paid") return NextResponse.redirect(externalUrl(req, "/invoices"), 303);

  await db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, tenantId: auth.tenantId, status: "PENDING" },
      include: { items: true },
    });
    if (!order) return;

    await tx.order.update({ where: { id }, data: { status: "PAID", method: "cash" } });
    for (const item of order.items) {
      if (item.kind !== "package" || !item.refId || !order.clientId) continue;
      const pkg = await tx.package.findFirst({ where: { id: item.refId, tenantId: auth.tenantId } });
      if (!pkg) continue;
      for (let n = 0; n < item.qty; n++) {
        await tx.clientPackage.create({
          data: {
            tenantId: auth.tenantId,
            clientId: order.clientId,
            packageId: pkg.id,
            creditsLeft: pkg.credits,
            expiresAt: initialExpiry(pkg),
            pricePaid: pkg.price,
          },
        });
      }
    }
  });
  return NextResponse.redirect(externalUrl(req, "/invoices"), 303);
}
