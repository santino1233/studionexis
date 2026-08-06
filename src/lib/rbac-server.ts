// Server-side RBAC enforcement (Roles card cmsbkg0qd001rhlv5882s8t7y).
//
// This is a plain server module (NO "use server", no client imports) used by
// the admin route handlers and server components to authoritatively reject
// unauthorized actions. It loads the tenant's customized `policies.roles` so
// per-tenant tuning is honored — never trust the client / the coarse enum alone.
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type Session } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { capabilitiesForRole, can, type Capability } from "@/lib/rbac";

/** Resolve the current session + its effective capabilities on its tenant. */
export async function sessionCapabilities(): Promise<{ session: Session | null; caps: Capability[] }> {
  const session = await getSession();
  if (!session) return { session: null, caps: [] };
  const tenant = await db.tenant.findUnique({ where: { id: session.tenantId }, select: { policies: true } });
  return { session, caps: capabilitiesForRole(session.role, tenant?.policies) };
}

/**
 * Route-handler guard. Returns a redirect `NextResponse` to return early when
 * the caller is not signed in (→ /login) or lacks the capability
 * (→ /dashboard?error=forbidden); returns `null` when the action is allowed.
 *
 *   const denied = await guardCap(req, "manage_products");
 *   if (denied) return denied;
 */
export async function guardCap(req: Request, capability: Capability): Promise<NextResponse | null> {
  const { session, caps } = await sessionCapabilities();
  if (!session) return NextResponse.redirect(externalUrl(req, "/login"), 303);
  if (!can(caps, capability)) return NextResponse.redirect(externalUrl(req, "/dashboard?error=forbidden"), 303);
  return null;
}

/** Server-component guard: redirect away if the viewer lacks the capability. */
export async function guardPage(capability: Capability): Promise<void> {
  const { session, caps } = await sessionCapabilities();
  if (!session) redirect("/login");
  if (!can(caps, capability)) redirect("/dashboard?error=forbidden");
}

