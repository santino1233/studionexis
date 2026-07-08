import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { externalUrl } from "@/lib/request-url";
import { rateLimit } from "@/lib/rate-limit";

// Customer reserves a package: creates a PENDING order the studio marks
// paid at the desk (which is when the credits are granted).
export async function POST(req: Request) {
  if (!rateLimit(req, "pkgreserve", 10, 300)) {
    return new NextResponse("Too many attempts — slow down and try again shortly.", { status: 429 });
  }
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const back = `/book/${slug}/packages`;

  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const cs = await getCustomerSession();
  if (!cs || cs.tenantId !== tenant.id) return NextResponse.redirect(externalUrl(req, `${back}?ok=login`), 303);

  const pkg = await db.package.findFirst({ where: { id: String(form.get("packageId") ?? ""), tenantId: tenant.id, active: true } });
  if (!pkg) return NextResponse.redirect(externalUrl(req, back), 303);

  await db.$transaction(async (tx) => {
    const last = await tx.order.findFirst({ where: { tenantId: tenant.id }, orderBy: { number: "desc" }, select: { number: true } });
    await tx.order.create({
      data: {
        tenantId: tenant.id,
        clientId: cs.clientId,
        number: (last?.number ?? 0) + 1,
        total: pkg.price,
        method: "at_studio",
        status: "PENDING",
        items: { create: [{ kind: "package", refId: pkg.id, label: pkg.name, qty: 1, unitPrice: pkg.price }] },
      },
    });
  });
  return NextResponse.redirect(externalUrl(req, `${back}?ok=reserved`), 303);
}
