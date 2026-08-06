import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";
import { EDITABLE_ROLES, isCapability } from "@/lib/rbac";

// Team roles editor (Roles card cmsbkg0qd001rhlv5882s8t7y).
//   action=role   — set the capability list a role can do (policies.roles[ROLE])
//   action=assign — assign a role to a team member (User.role)
// Both require the `manage_team` capability (Owner by default).
const EDITABLE = new Set(EDITABLE_ROLES.map((r) => r.key));

export async function POST(req: Request) {
  const denied = await guardCap(req, "manage_team");
  if (denied) return denied;
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const back = "/settings?tab=roles";

  if (action === "role") {
    const role = String(form.get("role") ?? "");
    if (!EDITABLE.has(role)) return NextResponse.redirect(externalUrl(req, `${back}&error=role`), 303);
    const capabilities = form.getAll("cap").map(String).filter(isCapability);

    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
    const policies = (tenant.policies ?? {}) as Record<string, unknown>;
    const roles = (policies.roles && typeof policies.roles === "object" ? policies.roles : {}) as Record<string, unknown>;
    const prev = (roles[role] && typeof roles[role] === "object" ? roles[role] : {}) as Record<string, unknown>;
    roles[role] = { ...prev, capabilities };
    policies.roles = roles;
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: policies as object } });
    return NextResponse.redirect(externalUrl(req, `${back}&saved=1`), 303);
  }

  if (action === "assign") {
    const userId = String(form.get("userId") ?? "");
    const role = String(form.get("role") ?? "");
    if (!EDITABLE.has(role)) return NextResponse.redirect(externalUrl(req, `${back}&error=role`), 303);
    const target = await db.user.findFirst({ where: { id: userId, tenantId: auth.tenantId } });
    // Never touch the Owner account's role from here.
    if (!target || target.role === "OWNER") return NextResponse.redirect(externalUrl(req, `${back}&error=assign`), 303);
    await db.user.update({ where: { id: target.id }, data: { role: role as "STAFF" | "INSTRUCTOR" | "MANAGER" } });
    return NextResponse.redirect(externalUrl(req, `${back}&saved=1`), 303);
  }

  return NextResponse.redirect(externalUrl(req, back), 303);
}

