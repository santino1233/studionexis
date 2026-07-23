// Create dedicated DEMO logins on the STAGING database only.
// Purpose: let the screen-capture tooling reach the auth-gated screens without
// touching or reusing any real person's account.
//
// Safety: refuses to run unless DATABASE_URL points at nexis_staging.
// Staging is rebuilt from live nightly, so these accounts are disposable.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL ?? "";
if (!/nexis_staging/.test(url)) {
  console.error("REFUSING: DATABASE_URL is not nexis_staging. Got:", url.replace(/:[^:@]*@/, ":***@"));
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const PASS = process.env.DEMO_PASS;
if (!PASS) { console.error("Set DEMO_PASS"); process.exit(1); }
const hash = bcrypt.hashSync(PASS, 10);

// 1) Studio owner on dev-studio (the tenant that already holds demo data)
const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "dev-studio" } });
const owner = await db.user.upsert({
  where: { tenantId_email: { tenantId: tenant.id, email: "demo.owner@studionexis.com" } },
  update: { passwordHash: hash, active: true, role: "OWNER", name: "Demo Owner" },
  create: {
    tenantId: tenant.id, email: "demo.owner@studionexis.com", passwordHash: hash,
    name: "Demo Owner", role: "OWNER", active: true,
  },
});
console.log("OWNER      ", owner.email, "-> tenant", tenant.slug);

// 2) Super-admin for the HQ portal (SUPERADMIN rows carry no tenant scope in practice;
//    reuse the existing superadmin's tenant linkage so the row is well-formed)
const existingSuper = await db.user.findFirst({ where: { role: "SUPERADMIN" } });
const superAdmin = await db.user.upsert({
  where: { tenantId_email: { tenantId: existingSuper?.tenantId ?? tenant.id, email: "demo.hq@studionexis.com" } },
  update: { passwordHash: hash, active: true, role: "SUPERADMIN", name: "Demo HQ Admin" },
  create: {
    tenantId: existingSuper?.tenantId ?? tenant.id, email: "demo.hq@studionexis.com",
    passwordHash: hash, name: "Demo HQ Admin", role: "SUPERADMIN", active: true,
  },
});
console.log("SUPERADMIN ", superAdmin.email);

// Report how populated the demo tenant is, so we know screens won't be empty.
const [clients, bookings, orders, sessions, products] = await Promise.all([
  db.client.count({ where: { tenantId: tenant.id } }),
  db.booking.count({ where: { tenantId: tenant.id } }),
  db.order.count({ where: { tenantId: tenant.id } }),
  db.classSession.count({ where: { tenantId: tenant.id } }),
  db.product.count({ where: { tenantId: tenant.id } }),
]);
console.log(`DEMO DATA   clients=${clients} bookings=${bookings} orders=${orders} sessions=${sessions} products=${products}`);
await db.$disconnect();
