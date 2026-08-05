// Role → module access (Wave 11 Y5). Deny-lists keep new pages open by
// default for owners/managers and locked down for the front desk.
//
//   OWNER      — the admin: everything
//   MANAGER    — runs the studio: everything except money-sensitive admin
//                (billing, staff pay, payroll)
//   STAFF      — reception portal: schedule, clients, sales desk
//   INSTRUCTOR — their classes and their earnings only

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Admin",
  MANAGER: "Manager",
  STAFF: "Reception",
  INSTRUCTOR: "Instructor",
};

const DENY: Record<string, string[]> = {
  OWNER: [],
  MANAGER: ["/billing", "/team", "/payroll", "/locations"],
  STAFF: ["/billing", "/team", "/payroll", "/analytics", "/expenses", "/settings", "/website", "/class-types", "/my-earnings", "/locations"],
  INSTRUCTOR: ["/billing", "/team", "/payroll", "/analytics", "/expenses", "/settings", "/website", "/class-types", "/pos", "/products", "/gift-cards", "/invoices", "/clients", "/bookings", "/welcome", "/inbox", "/locations"],
};

export function deniedPaths(role: string): string[] {
  return DENY[role] ?? DENY.STAFF;
}

export function canAccess(role: string, pathname: string): boolean {
  return !deniedPaths(role).some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Where each role lands after login — their portal's front door.
export function homeFor(role: string): string {
  return role === "INSTRUCTOR" ? "/schedule" : "/dashboard";
}
