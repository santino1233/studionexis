import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { customFeatures, featureRequests, slugifyFeature, type FeatureRequest } from "@/lib/features";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN") return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const hq = `/${process.env.HQ_PATH ?? "hq"}`;
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : hq;
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  const prev = (tenant.policies ?? {}) as Record<string, unknown>;

  if (action === "extend") {
    const from = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    await db.tenant.update({ where: { id }, data: { status: "TRIAL", trialEndsAt: new Date(from.getTime() + 7 * 86400_000) } });
  } else if (action === "activate") {
    await db.tenant.update({ where: { id }, data: { status: "ACTIVE", trialEndsAt: null } });
  } else if (action === "suspend") {
    await db.tenant.update({ where: { id }, data: { status: "SUSPENDED" } });
  } else if (action === "reactivate") {
    await db.tenant.update({ where: { id }, data: { status: tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? "TRIAL" : "ACTIVE" } });
  } else if (action === "plan") {
    const plan = String(form.get("plan") ?? "");
    if (["starter", "growth", "scale"].includes(plan)) {
      await db.tenant.update({ where: { id }, data: { plan } });
    }
  } else if (action === "feature-add") {
    const label = String(form.get("label") ?? "").trim().slice(0, 80);
    const price = Math.max(0, Number(form.get("price")) || 0);
    if (label) {
      const features = customFeatures(tenant);
      const fid = slugifyFeature(label);
      if (!features.some((f) => f.id === fid)) features.push({ id: fid, label, price, active: true });
      await db.tenant.update({ where: { id }, data: { policies: { ...prev, customFeatures: features } as Prisma.InputJsonValue } });
    }
  } else if (action === "feature-toggle" || action === "feature-remove") {
    const fid = String(form.get("fid") ?? "");
    let features = customFeatures(tenant);
    features = action === "feature-remove"
      ? features.filter((f) => f.id !== fid)
      : features.map((f) => (f.id === fid ? { ...f, active: !f.active } : f));
    await db.tenant.update({ where: { id }, data: { policies: { ...prev, customFeatures: features } as Prisma.InputJsonValue } });
  } else if (action === "request-status") {
    const idx = Number(form.get("idx"));
    const status = String(form.get("status")) as FeatureRequest["status"];
    const requests = featureRequests(tenant);
    if (Number.isInteger(idx) && requests[idx] && ["NEW", "REVIEWING", "DONE", "DECLINED"].includes(status)) {
      requests[idx] = { ...requests[idx], status };
      await db.tenant.update({ where: { id }, data: { policies: { ...prev, featureRequests: requests } as Prisma.InputJsonValue } });
    }
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
