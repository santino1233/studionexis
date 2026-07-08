import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const studioName = String(form.get("studioName") ?? "").trim();
  const className = String(form.get("className") ?? "").trim();
  const pkgName = String(form.get("pkgName") ?? "").trim();

  await db.$transaction(async (tx) => {
    if (studioName) {
      await tx.tenant.update({
        where: { id: auth.tenantId },
        data: {
          name: studioName,
          currency: String(form.get("currency") ?? "USD"),
          timezone: String(form.get("timezone") ?? "Asia/Bangkok"),
        },
      });
    }
    if (className) {
      await tx.classType.create({
        data: {
          tenantId: auth.tenantId,
          name: className,
          durationMin: Math.max(10, Number(form.get("classDuration") ?? 60) || 60),
          capacity: Math.max(1, Number(form.get("classCapacity") ?? 10) || 10),
          price: String(Number(form.get("classPrice") ?? 0) || 0),
        },
      });
    }
    if (pkgName) {
      await tx.package.create({
        data: {
          tenantId: auth.tenantId,
          name: pkgName,
          credits: Math.max(1, Number(form.get("pkgCredits") ?? 10) || 10),
          validityDays: 90,
          price: String(Number(form.get("pkgPrice") ?? 0) || 0),
        },
      });
    }
  });
  return NextResponse.redirect(externalUrl(req, "/dashboard?welcome=done"), 303);
}
