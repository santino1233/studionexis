/**
 * Migrate ONE studio from the old system (Mongo, /opt/studionexis) into
 * Studio Nexis v2 (Postgres).
 *
 * Usage:
 *   OLD_MONGO_URL='mongodb://root:<pw>@127.0.0.1:27118/?authSource=admin' \
 *     npx tsx scripts/migrate-tenant.ts <slug> [--wipe]
 *
 * --wipe removes a previously migrated copy of that slug from Postgres
 * first, so reruns are clean. Reads the old Mongo READ-ONLY.
 * Rehearse on a disposable tenant (wizard-test / flow-e2e) before any
 * real studio. Field mappings are best-effort from the old C# entities —
 * the rehearsal run is what validates them.
 */
import "dotenv/config";
import { MongoClient, type Db, type Document } from "mongodb";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const pg = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const slug = process.argv[2];
const wipe = process.argv.includes("--wipe");
if (!slug || !process.env.OLD_MONGO_URL) {
  console.error("usage: OLD_MONGO_URL=... npx tsx scripts/migrate-tenant.ts <slug> [--wipe]");
  process.exit(1);
}

const oid = (v: unknown) => (v == null ? null : String(v));
const dec = (v: unknown) => (v == null || isNaN(Number(v)) ? "0.00" : Number(v).toFixed(2));
const date = (v: unknown, fallback = new Date()) => (v ? new Date(v as string | Date) : fallback);

async function main() {
  const mongo = new MongoClient(process.env.OLD_MONGO_URL!);
  await mongo.connect();

  // Control-plane tenant record
  const control = mongo.db("studionexis");
  const oldTenant = await control.collection("Tenants").findOne({ Slug: slug });
  if (!oldTenant) throw new Error(`No tenant '${slug}' in old control DB`);
  const tdb: Db = mongo.db(oldTenant.DatabaseName ?? `tenant_${slug}`);
  const all = (c: string) => tdb.collection(c).find().toArray();

  const [users, clients, blueprints, sessions, attendances, waitlist, products, clientPackages, invoices, expenses, settings] =
    await Promise.all([
      all("Users"), all("Clients"), all("ClassBlueprints"), all("CalendarSessions"),
      all("Attendances"), all("Waitlist"), all("Products"), all("ClientPackages"),
      all("Invoices"), all("Expenses"), tdb.collection("Settings").findOne({}),
    ]);
  console.log(`old data: users=${users.length} clients=${clients.length} classTypes=${blueprints.length} sessions=${sessions.length} attendances=${attendances.length} waitlist=${waitlist.length} products=${products.length} clientPkgs=${clientPackages.length} invoices=${invoices.length} expenses=${expenses.length}`);

  if (wipe) {
    const prev = await pg.tenant.findUnique({ where: { slug } });
    if (prev) {
      await pg.tenant.delete({ where: { id: prev.id } }); // cascades
      console.log("wiped previous copy");
    }
  }
  if (await pg.tenant.findUnique({ where: { slug } })) throw new Error(`'${slug}' already exists in v2 — use --wipe to replace`);

  const profile = (settings as Document | null)?.StudioProfile ?? {};
  const subStatus = String(oldTenant.SubscriptionStatus ?? "TRIALING");
  const tenant = await pg.tenant.create({
    data: {
      slug,
      name: profile.StudioName ?? oldTenant.DisplayName ?? slug,
      customDomain: oldTenant.CustomDomain ?? null,
      plan: String(oldTenant.Plan ?? "starter").toLowerCase(),
      status: oldTenant.Status === "SUSPENDED" ? "SUSPENDED" : subStatus === "ACTIVE" ? "ACTIVE" : subStatus === "PAST_DUE" ? "PAST_DUE" : "TRIAL",
      trialEndsAt: oldTenant.TrialEndsAt ? date(oldTenant.TrialEndsAt) : null,
      currency: profile.Currency ?? "VND",
      timezone: profile.TimeZone ?? "Asia/Ho_Chi_Minh",
      brandColor: profile.BrandColor ?? "#F97316",
    },
  });

  // Users — bcrypt hashes carry over (.NET BCrypt.Net emits $2a/$2b, compatible)
  const userMap = new Map<string, string>();
  for (const u of users) {
    const role = /admin|owner/i.test(String(u.Role)) ? "OWNER" : /instructor/i.test(String(u.Role)) ? "INSTRUCTOR" : "STAFF";
    try {
      const created = await pg.user.create({
        data: {
          tenantId: tenant.id,
          email: String(u.Email ?? "").toLowerCase(),
          name: u.Name ?? "Team member",
          role,
          passwordHash: String(u.PasswordHash ?? ""),
          active: u.Active !== false,
        },
      });
      userMap.set(oid(u._id)!, created.id);
    } catch { /* duplicate email in-tenant — skip */ }
  }

  // Clients
  const clientMap = new Map<string, string>();
  for (const c of clients) {
    const created = await pg.client.create({
      data: {
        tenantId: tenant.id,
        name: c.FullName ?? "Client",
        phone: c.PhoneNumber ?? null,
        email: c.Email ? String(c.Email).toLowerCase() : null,
        channel: c.ContactPlatform && c.ContactPlatform !== "NONE" ? String(c.ContactPlatform).toLowerCase() : c.ReferralSource ?? null,
        medicalNotes: c.MedicalHistory ?? null,
        notes: c.InternalNotes ?? null,
        memberSince: date(c.CreatedAt ?? c.MemberSince),
        lastVisitAt: c.LastVisitAt ? date(c.LastVisitAt) : null,
      },
    });
    clientMap.set(oid(c._id)!, created.id);
  }

  // Class types
  const typeMap = new Map<string, string>();
  for (const b of blueprints) {
    const created = await pg.classType.create({
      data: {
        tenantId: tenant.id,
        name: b.ClassName ?? "Class",
        kind: b.Format === "PRIVATE" ? "PRIVATE" : "GROUP",
        durationMin: b.DurationMinutes ?? 60,
        capacity: b.DefaultCapacity ?? 10,
        price: dec(b.DropInPrice ?? b.BasePrice ?? 0),
        active: b.IsActive !== false,
      },
    });
    typeMap.set(oid(b._id)!, created.id);
  }
  // Fallback type for sessions whose blueprint is gone
  let fallbackTypeId: string | null = null;
  const fallbackType = async () => {
    if (!fallbackTypeId) {
      fallbackTypeId = (await pg.classType.create({ data: { tenantId: tenant.id, name: "Class (migrated)", active: false } })).id;
    }
    return fallbackTypeId;
  };

  // Sessions
  const sessionMap = new Map<string, string>();
  for (const s of sessions) {
    if (s.Status === "BLOCKED") continue;
    const created = await pg.classSession.create({
      data: {
        tenantId: tenant.id,
        classTypeId: typeMap.get(oid(s.ClassBlueprintId) ?? "") ?? (await fallbackType()),
        instructorId: userMap.get(oid(s.InstructorId) ?? "") ?? null,
        startsAt: date(s.StartTime),
        endsAt: date(s.EndTime, new Date(date(s.StartTime).getTime() + 3600_000)),
        capacity: s.Capacity ?? 10,
        status: s.Status === "CANCELLED" ? "CANCELLED" : s.Status === "COMPLETED" ? "COMPLETED" : "SCHEDULED",
      },
    });
    sessionMap.set(oid(s._id)!, created.id);
  }

  // Packages (old Products with credits) + retail products
  const pkgMap = new Map<string, string>();
  let pkgN = 0, prodN = 0;
  for (const p of products) {
    if ((p.Credits ?? 0) > 0) {
      const created = await pg.package.create({
        data: {
          tenantId: tenant.id,
          name: p.Name ?? "Package",
          credits: p.Credits,
          validityDays: p.ValidityDays ?? 90,
          price: dec(p.BasePrice),
          kind: p.FormatRestriction === "PRIVATE" ? "PRIVATE" : "GROUP",
          active: p.IsActive !== false,
        },
      });
      pkgMap.set(oid(p._id)!, created.id);
      pkgN++;
    } else {
      await pg.product.create({
        data: { tenantId: tenant.id, name: p.Name ?? "Product", price: dec(p.BasePrice), stock: p.StockQuantity ?? 0, active: p.IsActive !== false },
      });
      prodN++;
    }
  }
  let genericPkgId: string | null = null;
  const genericPkg = async () => {
    if (!genericPkgId) {
      genericPkgId = (await pg.package.create({ data: { tenantId: tenant.id, name: "Package (migrated)", credits: 1, price: "0.00", active: false } })).id;
    }
    return genericPkgId;
  };

  // Client packages / credits
  const cpMap = new Map<string, string>();
  for (const cp of clientPackages) {
    const clientId = clientMap.get(oid(cp.ClientId) ?? "");
    if (!clientId) continue;
    const created = await pg.clientPackage.create({
      data: {
        tenantId: tenant.id,
        clientId,
        packageId: pkgMap.get(oid(cp.ProductId ?? cp.PackageProductId) ?? "") ?? (await genericPkg()),
        creditsLeft: Math.max(0, cp.CreditsRemaining ?? 0),
        expiresAt: cp.ExpiryDate ? date(cp.ExpiryDate) : new Date(Date.now() + 90 * 86400_000),
        frozen: cp.Status === "FROZEN",
        pricePaid: dec(cp.PricePaid ?? 0),
        createdAt: date(cp.ActivationDate ?? cp.CreatedAt),
      },
    });
    cpMap.set(oid(cp._id)!, created.id);
  }

  // Bookings: Attendances + Waitlist
  let bookings = 0;
  const seen = new Set<string>();
  const addBooking = async (doc: Document, status: string) => {
    const sessionId = sessionMap.get(oid(doc.SessionId ?? doc.CalendarSessionId) ?? "");
    const clientId = clientMap.get(oid(doc.ClientId) ?? "");
    if (!sessionId || !clientId || seen.has(`${sessionId}:${clientId}`)) return;
    seen.add(`${sessionId}:${clientId}`);
    const raw = String(doc.Status ?? status);
    const mapped =
      /CHECKED|ATTEND|COMPLETED|PRESENT/i.test(raw) ? "CHECKED_IN" :
      /LATE/i.test(raw) ? "LATE_CANCEL" :
      /CANCEL/i.test(raw) ? "CANCELLED" :
      /NO.?SHOW/i.test(raw) ? "NO_SHOW" :
      status === "WAITLIST" ? "WAITLIST" : "BOOKED";
    await pg.booking.create({
      data: {
        tenantId: tenant.id,
        sessionId,
        clientId,
        status: mapped as never,
        paymentMethod: doc.PaymentMethod ? String(doc.PaymentMethod).toLowerCase() : cpMap.has(oid(doc.ClientPackageId) ?? "") ? "package_credit" : null,
        clientPackageId: cpMap.get(oid(doc.ClientPackageId) ?? "") ?? null,
        createdAt: date(doc.CreatedAt ?? doc.BookedAt),
      },
    });
    bookings++;
  };
  for (const a of attendances) await addBooking(a, "BOOKED");
  for (const w of waitlist) await addBooking(w, "WAITLIST");

  // Invoices → orders (one summary line each; keeps numbers + totals)
  let orders = 0;
  for (const [i, inv] of invoices.entries()) {
    const numRaw = parseInt(String(inv.InvoiceNumber ?? "").replace(/\D/g, ""), 10);
    await pg.order.create({
      data: {
        tenantId: tenant.id,
        clientId: clientMap.get(oid(inv.ClientId) ?? "") ?? null,
        number: Number.isFinite(numRaw) && numRaw > 0 ? numRaw : 100000 + i,
        total: dec(inv.TotalNet ?? inv.TotalGross),
        discount: dec(inv.TotalDiscount ?? 0),
        method: String(inv.PaymentMethod ?? "cash").toLowerCase(),
        status: inv.Status === "PENDING" ? "PENDING" : "PAID",
        createdAt: date(inv.IssueDate),
        items: { create: [{ kind: "migrated", label: `Invoice ${inv.InvoiceNumber ?? ""}`.trim(), qty: 1, unitPrice: dec(inv.TotalNet ?? inv.TotalGross) }] },
      },
    });
    orders++;
  }

  // Expenses
  let exp = 0;
  for (const e of expenses) {
    await pg.expense.create({
      data: {
        tenantId: tenant.id,
        category: e.Category ?? e.CategoryName ?? "Other",
        amount: dec(e.Amount),
        note: e.Description ?? e.Note ?? null,
        date: date(e.Date ?? e.ExpenseDate ?? e.CreatedAt),
      },
    });
    exp++;
  }

  console.log(`migrated '${slug}': users=${userMap.size} clients=${clientMap.size} classTypes=${typeMap.size} sessions=${sessionMap.size} bookings=${bookings} packages=${pkgN} products=${prodN} clientPkgs=${cpMap.size} orders=${orders} expenses=${exp}`);
  await mongo.close();
}

main()
  .catch((e) => { console.error("MIGRATION FAILED:", e.message); process.exit(1); })
  .finally(() => pg.$disconnect());
