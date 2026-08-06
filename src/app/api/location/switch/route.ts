import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

// Hop to another location in the same account. Only the org owner (matched by
// email having an OWNER user at the target) may switch, and only within the
// same Organization — no cross-account jumps.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_locations");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const form = await req.formData();
  const to = String(form.get("to") ?? "");

  const me = await db.user.findUnique({ where: { id: auth.userId } });
  const current = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  const target = await db.tenant.findUnique({ where: { id: to } });
  if (!me || !current || !target || !current.organizationId || current.organizationId !== target.organizationId) {
    return NextResponse.redirect(externalUrl(req, "/locations?error=1"), 303);
  }
  const owner = await db.user.findFirst({ where: { tenantId: target.id, email: me.email, active: true } });
  if (!owner) return NextResponse.redirect(externalUrl(req, "/locations?error=1"), 303);

  const { audit } = await import("@/lib/hq");
  audit({ tenantId: target.id, actor: me.name, role: "OWNER", action: "location-switched", detail: `${current.locationLabel || current.name} → ${target.locationLabel || target.name}` });

  await createSession({ userId: owner.id, tenantId: target.id, role: owner.role, name: owner.name });
  return NextResponse.redirect(externalUrl(req, "/dashboard"), 303);
}
