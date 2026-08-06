// Granular Roles / RBAC (Roles card cmsbkg0qd001rhlv5882s8t7y).
//
// This module is intentionally PURE — no database, no next/headers, no node
// crypto — so it can be imported from the edge middleware, server components,
// route handlers AND client components (the sidebar) alike.
//
// The coarse `UserRole` enum (OWNER / MANAGER / STAFF / INSTRUCTOR /
// SUPERADMIN) keeps working: each legacy role maps onto a preset capability
// set (ROLE_PRESETS). A tenant may override any role's capabilities by storing
// `policies.roles[ROLE] = { label?, capabilities: Capability[] }`; when unset we
// fall back to the safe preset. OWNER (and the platform SUPERADMIN) always keep
// every capability and can never be locked out.

// ── The discrete capabilities (grounded in the actual admin modules) ────────
export const CAPABILITIES = [
  { key: "manage_schedule",    label: "Manage schedule",   desc: "Class calendar, sessions & rosters",         group: "Studio" },
  { key: "manage_bookings",    label: "Manage bookings",   desc: "Reservations, check-ins & cancellations",    group: "Studio" },
  { key: "manage_class_types", label: "Manage class types",desc: "Class formats, levels & templates",          group: "Studio" },
  { key: "manage_clients",     label: "Manage clients",    desc: "Client records & the studio inbox",          group: "Clients" },
  { key: "run_pos",            label: "Run point of sale", desc: "Sell packages, take payments, refunds",      group: "Sales" },
  { key: "manage_products",    label: "Manage products",   desc: "Products, packages & gift vouchers",         group: "Sales" },
  { key: "manage_invoices",    label: "Manage invoices",   desc: "Orders & invoices",                          group: "Sales" },
  { key: "manage_team",        label: "Manage team & roles", desc: "Add staff, assign roles & permissions",    group: "Team & insights" },
  { key: "view_analytics",     label: "View analytics",    desc: "Reports, dashboards & insights",             group: "Team & insights" },
  { key: "manage_payroll",     label: "Manage payroll",    desc: "Pay, commission & payroll runs",             group: "Team & insights" },
  { key: "manage_expenses",    label: "Manage expenses",   desc: "Expenses & profit / loss",                   group: "Team & insights" },
  { key: "manage_website",     label: "Manage website",    desc: "Booking-site builder & content",             group: "Workspace" },
  { key: "manage_apps",        label: "Manage apps",       desc: "App store & integrations",                   group: "Workspace" },
  { key: "manage_locations",   label: "Manage locations",  desc: "Multi-location setup & catalog sync",        group: "Workspace" },
  { key: "manage_billing",     label: "Manage billing",    desc: "Plan, invoices & SMS top-ups",               group: "Workspace" },
  { key: "manage_settings",    label: "Manage settings",   desc: "Studio identity, policies & security",       group: "Workspace" },
] as const;

export type Capability = (typeof CAPABILITIES)[number]["key"];

export const ALL_CAPABILITIES: Capability[] = CAPABILITIES.map((c) => c.key);
const CAP_SET = new Set<string>(ALL_CAPABILITIES);

export function isCapability(v: unknown): v is Capability {
  return typeof v === "string" && CAP_SET.has(v);
}

// ── Legacy role → preset capabilities (the safe defaults) ───────────────────
// OWNER / SUPERADMIN are handled as "everything" in code and never listed here.
// The presets mirror the existing coarse access rules in src/lib/access.ts so
// current users see no change until a tenant deliberately customizes a role.
export const ROLE_PRESETS: Record<string, Capability[]> = {
  // Runs the studio — everything except the money-/people-sensitive admin.
  MANAGER: [
    "manage_schedule", "manage_bookings", "manage_class_types", "manage_clients",
    "run_pos", "manage_products", "manage_invoices", "view_analytics",
    "manage_expenses", "manage_website", "manage_apps", "manage_settings",
  ],
  // Front desk / reception — sell, book and look after clients.
  STAFF: [
    "manage_schedule", "manage_bookings", "manage_clients",
    "run_pos", "manage_products", "manage_invoices", "manage_apps",
  ],
  // Instructor — just their classes on the schedule.
  INSTRUCTOR: ["manage_schedule"],
};

// Roles a tenant is allowed to tune in the editor (OWNER is fixed at full).
export const EDITABLE_ROLES: { key: string; label: string; hint: string }[] = [
  { key: "MANAGER",    label: "Manager",    hint: "Runs the studio day to day" },
  { key: "STAFF",      label: "Front desk", hint: "Reception, sales & bookings" },
  { key: "INSTRUCTOR", label: "Instructor", hint: "Teaches classes" },
];

export function isFullAccessRole(role: string | undefined | null): boolean {
  return role === "OWNER" || role === "SUPERADMIN";
}

// ── Resolve the effective capabilities for a role on a given tenant ──────────
// `policies` is the tenant's `policies` JSON (may be undefined in the edge
// middleware, where no DB read is available — presets are used there).
type RolesPolicy = Record<string, { label?: string; capabilities?: unknown } | undefined>;

export function capabilitiesForRole(
  role: string | undefined | null,
  policies?: unknown,
): Capability[] {
  if (isFullAccessRole(role)) return [...ALL_CAPABILITIES];
  const key = String(role ?? "");
  const custom = readRolesPolicy(policies)?.[key];
  if (custom && Array.isArray(custom.capabilities)) {
    return custom.capabilities.filter(isCapability);
  }
  return [...(ROLE_PRESETS[key] ?? ROLE_PRESETS.STAFF)];
}

export function readRolesPolicy(policies: unknown): RolesPolicy | null {
  if (policies && typeof policies === "object" && "roles" in policies) {
    const roles = (policies as { roles?: unknown }).roles;
    if (roles && typeof roles === "object") return roles as RolesPolicy;
  }
  return null;
}

// The effective, customized-or-preset capabilities for every editable role,
// used to render the editor. OWNER is reported as full access.
export function effectiveRoleCapabilities(policies?: unknown): Record<string, Capability[]> {
  const out: Record<string, Capability[]> = { OWNER: [...ALL_CAPABILITIES] };
  for (const r of EDITABLE_ROLES) out[r.key] = capabilitiesForRole(r.key, policies);
  return out;
}

// ── Capability checks ───────────────────────────────────────────────────────
export function can(caps: Capability[], capability: Capability): boolean {
  return caps.includes(capability);
}

export function roleCan(role: string | undefined | null, capability: Capability, policies?: unknown): boolean {
  return isFullAccessRole(role) || capabilitiesForRole(role, policies).includes(capability);
}

// ── Admin path → required capability (for nav hiding & optional page guards) ─
// Paths not listed here are open to any authenticated staff member
// (dashboard, getting-started, welcome, support, my-earnings, whats-new…).
const PATH_CAPS: { prefix: string; cap: Capability }[] = [
  { prefix: "/schedule",    cap: "manage_schedule" },
  { prefix: "/classes",     cap: "manage_schedule" },
  { prefix: "/bookings",    cap: "manage_bookings" },
  { prefix: "/clients",     cap: "manage_clients" },
  { prefix: "/inbox",       cap: "manage_clients" },
  { prefix: "/class-types", cap: "manage_class_types" },
  { prefix: "/pos",         cap: "run_pos" },
  { prefix: "/products",    cap: "manage_products" },
  { prefix: "/invoices",    cap: "manage_invoices" },
  { prefix: "/team",        cap: "manage_team" },
  { prefix: "/analytics",   cap: "view_analytics" },
  { prefix: "/payroll",     cap: "manage_payroll" },
  { prefix: "/expenses",    cap: "manage_expenses" },
  { prefix: "/website",     cap: "manage_website" },
  { prefix: "/apps",        cap: "manage_apps" },
  { prefix: "/locations",   cap: "manage_locations" },
  { prefix: "/billing",     cap: "manage_billing" },
  { prefix: "/settings",    cap: "manage_settings" },
];

export function capabilityForPath(pathname: string): Capability | null {
  const hit = PATH_CAPS.find((p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"));
  return hit ? hit.cap : null;
}

// Nav helper: given a role's resolved capabilities, may it open this path?
export function pathAllowedByCaps(caps: Capability[], pathname: string): boolean {
  const need = capabilityForPath(pathname);
  return need === null || caps.includes(need);
}

