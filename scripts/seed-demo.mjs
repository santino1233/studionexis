// Demo data seeder for the dev-studio tenant — clients, blueprints with
// recurring schedules, past completed classes with payments, upcoming
// bookings, package purchases, expenses. Run: node scripts/seed-demo.mjs
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

for (const line of readFileSync("/opt/nexis/.env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Deterministic PRNG so the dataset is stable.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// Same conversion the app uses (lib/tz): local wall time in tz → UTC instant.
function utcFromZoned(dateStr, timeStr, tz) {
  const pretendUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const asTz = new Date(pretendUtc.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(pretendUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(pretendUtc.getTime() + (asUtc.getTime() - asTz.getTime()));
}
const dayKeyInTz = (d, tz) => d.toLocaleDateString("en-CA", { timeZone: tz });

const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "dev-studio" } });
const tz = tenant.timezone;
const T = tenant.id;

const already = await db.client.findFirst({ where: { tenantId: T, tags: { has: "demo-seed" } } });
if (already) {
  console.log("Demo data already seeded — nothing to do.");
  process.exit(0);
}

// ── Team ───────────────────────────────────────────────────────────────
const mia = await db.user.findFirstOrThrow({ where: { tenantId: T, name: "Mia Instructor" } });
const pw = await bcrypt.hash("DemoStaff-2026!", 10);
const sofia = await db.user.upsert({
  where: { tenantId_email: { tenantId: T, email: "sofia@dev-studio.com" } },
  update: {},
  create: { tenantId: T, email: "sofia@dev-studio.com", passwordHash: pw, name: "Sofia Tran", role: "INSTRUCTOR", commissionRate: 25 },
});
await db.user.upsert({
  where: { tenantId_email: { tenantId: T, email: "ben@dev-studio.com" } },
  update: {},
  create: { tenantId: T, email: "ben@dev-studio.com", passwordHash: pw, name: "Ben Carter", role: "STAFF" },
});

// ── Class blueprints (uses the studio's custom vocab) ─────────────────
// De-dupe the old second "Reformer Flow".
await db.classType.updateMany({ where: { tenantId: T, name: "Reformer Flow", durationMin: 55 }, data: { name: "Reformer Restore" } });

const BLUEPRINTS = [
  { name: "Reformer Flow", format: "Reformer", difficulty: "Athletic", color: "#F97316", capacity: 8, price: 18.5,
    description: "A dynamic full-body reformer sequence that builds strength and control through continuous, flowing transitions.",
    benefits: ["Core strength", "Posture", "Lean muscle tone"], goodFor: ["Regulars", "Athletes", "Desk workers"],
    tags: ["Low impact", "Full body"], equipment: ["Reformer", "Grip socks"],
    muscles: ["abs", "obliques", "gluteal", "hamstring", "quadriceps"],
    instructorId: mia.id, slots: [{ day: 0, time: "07:30" }, { day: 2, time: "07:30" }, { day: 4, time: "17:30" }] },
  { name: "Reformer Restore", format: "Reformer", difficulty: "Gentle", color: "#22A5A0", capacity: 8, price: 25,
    description: "Slow, supported reformer work focused on mobility, breath and unwinding tight shoulders and hips.",
    benefits: ["Mobility", "Stress relief", "Better sleep"], goodFor: ["Beginners", "Prenatal", "Recovery days"],
    tags: ["Restorative"], equipment: ["Reformer", "Bolster"],
    muscles: ["lower-back", "neck", "trapezius", "hamstring"],
    instructorId: sofia.id, slots: [{ day: 1, time: "18:30" }, { day: 5, time: "10:00" }] },
  { name: "Mat Pilates", format: "Mat", difficulty: "All levels", color: "#8B5CF6", capacity: 12, price: 18,
    description: "Classic mat work — the foundation of everything we do. Expect planks, roll-ups and a strong burn.",
    benefits: ["Core strength", "Flexibility", "Body awareness"], goodFor: ["Beginners", "Everyone"],
    tags: ["Classic", "No equipment"], equipment: ["Mat"],
    muscles: ["abs", "obliques", "lower-back"],
    instructorId: sofia.id, slots: [{ day: 1, time: "09:00" }, { day: 3, time: "09:00" }, { day: 6, time: "09:30" }] },
  { name: "Power Reformer", format: "Reformer", difficulty: "Athletic", color: "#E5484D", capacity: 8, price: 28,
    description: "Our toughest 50 minutes: heavy springs, jumpboard cardio bursts and loaded lunges. Come ready to work.",
    benefits: ["Strength", "Endurance", "Cardio fitness"], goodFor: ["Athletes", "Regulars"],
    tags: ["Advanced", "Sweat"], equipment: ["Reformer", "Jumpboard", "Hand weights"],
    muscles: ["quadriceps", "gluteal", "deltoids", "biceps", "calves", "abs"],
    instructorId: mia.id, slots: [{ day: 2, time: "18:30" }, { day: 5, time: "08:30" }] },
  { name: "Barre Sculpt", format: "Barre", difficulty: "Moderate", color: "#D6409F", capacity: 12, price: 20,
    description: "Ballet-inspired small-movement training at the barre — high reps, light weights, shaking legs guaranteed.",
    benefits: ["Muscle endurance", "Balance", "Toned legs"], goodFor: ["Dancers", "Desk workers"],
    tags: ["Barre", "Low impact"], equipment: ["Barre", "Light weights", "Pilates ball"],
    muscles: ["calves", "quadriceps", "gluteal", "adductors"],
    instructorId: sofia.id, slots: [{ day: 0, time: "18:00" }, { day: 3, time: "18:00" }] },
];

const types = {};
for (const bp of BLUEPRINTS) {
  const existing = await db.classType.findFirst({ where: { tenantId: T, name: bp.name } });
  const data = {
    description: bp.description, format: bp.format, difficulty: bp.difficulty, color: bp.color,
    capacity: bp.capacity, price: bp.price, benefits: bp.benefits, goodFor: bp.goodFor, tags: bp.tags,
    equipment: bp.equipment, muscles: bp.muscles, defaultInstructorId: bp.instructorId,
    publicByDefault: true, recurringSlots: bp.slots, active: true,
  };
  types[bp.name] = existing
    ? await db.classType.update({ where: { id: existing.id }, data })
    : await db.classType.create({ data: { tenantId: T, name: bp.name, durationMin: 50, kind: "GROUP", ...data } });
}

// ── Clients ────────────────────────────────────────────────────────────
const FIRST = ["Ava", "Linh", "Maya", "Chloe", "Ngoc", "Sarah", "Emma", "Julia", "Hana", "Grace", "Thao", "Olivia", "Mai", "Lucy", "Anna", "Kim", "Tara", "Vy", "Elena", "Ruby", "Daniel", "Marcus", "Huy", "Tom", "Leo"];
const LAST = ["Nguyen", "Tran", "Smith", "Lee", "Pham", "Johnson", "Le", "Brown", "Vu", "Chen", "Garcia", "Hoang", "Miller", "Dang", "Wilson", "Bui", "Taylor", "Do", "Moore", "Ngo", "White", "Ly", "Clark", "Vo", "King"];
const CHANNELS = ["instagram", "website", "walk-in", "zalo", "referral"];
const TAG_POOL = [["vip"], ["new"], ["prenatal"], ["morning-crew"], [], [], []];
const portalPw = await bcrypt.hash("demo1234", 10);

const clients = [];
for (let i = 0; i < 25; i++) {
  const name = `${FIRST[i]} ${LAST[i]}`;
  const daysAgo = between(5, 200);
  clients.push(await db.client.create({
    data: {
      tenantId: T, name,
      phone: `555-2${String(100 + i)}`,
      email: rnd() < 0.7 ? `${FIRST[i].toLowerCase()}.${LAST[i].toLowerCase()}@example.com` : null,
      channel: pick(CHANNELS),
      tags: ["demo-seed", ...pick(TAG_POOL)],
      birthday: rnd() < 0.6 ? new Date(Date.UTC(between(1970, 2004), between(0, 11), between(1, 28))) : null,
      passwordHash: i < 8 ? portalPw : null,
      memberSince: new Date(Date.now() - daysAgo * 86400_000),
      notes: rnd() < 0.2 ? "Prefers the back row." : null,
      medicalNotes: rnd() < 0.15 ? "Lower-back sensitivity — avoid deep flexion." : null,
    },
  }));
}

// ── Voucher ────────────────────────────────────────────────────────────
await db.voucher.upsert({
  where: { tenantId_code: { tenantId: T, code: "WELCOME10" } },
  update: {},
  create: { tenantId: T, code: "WELCOME10", type: "PERCENT", value: 10, maxUses: 100 },
});

// ── Package purchases (orders over the past ~6 weeks) ────────────────
const packs = await db.package.findMany({ where: { tenantId: T, active: true } });
let orderNo = (await db.order.findFirst({ where: { tenantId: T }, orderBy: { number: "desc" } }))?.number ?? 0;
const clientPacks = [];
for (let i = 0; i < 14; i++) {
  const client = clients[i]; // first 14 clients own a package
  const pack = pick(packs);
  const boughtDaysAgo = between(3, 42);
  const createdAt = new Date(Date.now() - boughtDaysAgo * 86400_000);
  const order = await db.order.create({
    data: {
      tenantId: T, clientId: client.id, number: ++orderNo,
      total: pack.price, method: pick(["cash", "card", "transfer"]), status: "PAID", createdAt,
      items: { create: [{ kind: "package", refId: pack.id, label: pack.name, qty: 1, unitPrice: pack.price }] },
    },
  });
  clientPacks.push(await db.clientPackage.create({
    data: {
      tenantId: T, clientId: client.id, packageId: pack.id,
      creditsLeft: pack.credits, // consumed below by past bookings
      expiresAt: new Date(createdAt.getTime() + pack.validityDays * 86400_000),
      pricePaid: pack.price, createdAt,
    },
  }));
  void order;
}

// ── Past sessions from the weekly slots (3 weeks back), completed ─────
const products = await db.product.findMany({ where: { tenantId: T, active: true } });
let checkins = 0, pastSessions = 0, dropinOrders = 0;
for (let daysBack = 21; daysBack >= 1; daysBack--) {
  const day = new Date(Date.now() - daysBack * 86400_000);
  const dayKey = dayKeyInTz(day, tz);
  const weekday = (new Date(`${dayKey}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0
  for (const bp of BLUEPRINTS) {
    const ct = types[bp.name];
    for (const slot of bp.slots.filter((s) => s.day === weekday)) {
      const startsAt = utcFromZoned(dayKey, slot.time, tz);
      if (startsAt > new Date()) continue;
      if (await db.classSession.findFirst({ where: { tenantId: T, classTypeId: ct.id, startsAt } })) continue;

      const instructor = ct.defaultInstructorId === mia.id ? mia : sofia;
      const session = await db.classSession.create({
        data: {
          tenantId: T, classTypeId: ct.id, instructorId: ct.defaultInstructorId,
          startsAt, endsAt: new Date(startsAt.getTime() + ct.durationMin * 60_000),
          capacity: ct.capacity, status: "COMPLETED", isPublic: true,
        },
      });
      pastSessions++;

      // 40–90% full, mostly checked in, credits when the client has them.
      const attendees = [...clients].sort(() => rnd() - 0.5).slice(0, between(Math.ceil(ct.capacity * 0.4), Math.min(ct.capacity, Math.ceil(ct.capacity * 0.9))));
      let revenue = 0;
      for (const client of attendees) {
        const roll = rnd();
        const status = roll < 0.82 ? "CHECKED_IN" : roll < 0.92 ? "NO_SHOW" : "CANCELLED";
        const cp = clientPacks.find((p) => p.clientId === client.id && p.creditsLeft > 0 && p.createdAt <= startsAt);
        if (status === "CANCELLED") {
          await db.booking.create({ data: { tenantId: T, sessionId: session.id, clientId: client.id, status, createdAt: new Date(startsAt.getTime() - 3 * 86400_000) } });
          continue;
        }
        if (cp) {
          cp.creditsLeft--;
          await db.clientPackage.update({ where: { id: cp.id }, data: { creditsLeft: { decrement: 1 } } });
          await db.booking.create({
            data: { tenantId: T, sessionId: session.id, clientId: client.id, status, paymentMethod: "package_credit", clientPackageId: cp.id, createdAt: new Date(startsAt.getTime() - 2 * 86400_000) },
          });
          if (status === "CHECKED_IN") {
            const pack = packs.find((p) => p.id === cp.packageId);
            revenue += Number(pack.price) / pack.credits;
          }
        } else {
          // Drop-in, paid at the desk (order created when they showed up).
          let orderId = null;
          if (status === "CHECKED_IN") {
            const withMerch = rnd() < 0.12 && products.length > 0;
            const prod = withMerch ? pick(products) : null;
            const total = Number(ct.price) + (prod ? Number(prod.price) : 0);
            const order = await db.order.create({
              data: {
                tenantId: T, clientId: client.id, number: ++orderNo, total,
                method: pick(["cash", "card"]), status: "PAID", createdAt: startsAt,
                items: { create: [
                  { kind: "dropin", refId: session.id, label: `${ct.name} (drop-in)`, qty: 1, unitPrice: ct.price },
                  ...(prod ? [{ kind: "product", refId: prod.id, productId: prod.id, label: prod.name, qty: 1, unitPrice: prod.price }] : []),
                ] },
              },
            });
            orderId = order.id;
            revenue += Number(ct.price);
            dropinOrders++;
          }
          await db.booking.create({
            data: { tenantId: T, sessionId: session.id, clientId: client.id, status, paymentMethod: "at_studio", orderId, createdAt: new Date(startsAt.getTime() - 86400_000) },
          });
        }
        if (status === "CHECKED_IN") {
          checkins++;
          await db.client.update({ where: { id: client.id }, data: { lastVisitAt: startsAt } });
        }
      }
      const rate = Number(instructor.commissionRate);
      await db.classSession.update({
        where: { id: session.id },
        data: { revenue: revenue.toFixed(2), instructorEarnings: ((revenue * rate) / 100).toFixed(2) },
      });
    }
  }
}

// ── Future sessions: materialise the slots, then scatter bookings ─────
const res = await fetch(`http://127.0.0.1:3105/api/cron/materialise?token=${process.env.CRON_TOKEN}`, { method: "POST" });
const made = (await res.json()).created;

const upcoming = await db.classSession.findMany({
  where: { tenantId: T, status: "SCHEDULED", startsAt: { gt: new Date(), lt: new Date(Date.now() + 10 * 86400_000) } },
  include: { bookings: { select: { clientId: true, qty: true } } },
  orderBy: { startsAt: "asc" },
});
let futureBookings = 0, waitlisted = 0;
for (const [i, s] of upcoming.entries()) {
  const takenIds = new Set(s.bookings.map((b) => b.clientId));
  let spots = s.capacity - s.bookings.reduce((n, b) => n + b.qty, 0);
  const fillTo = i === 0 ? s.capacity + 1 : between(2, Math.max(3, s.capacity - 2)); // first class overbooks → waitlist demo
  const pool = [...clients].sort(() => rnd() - 0.5).filter((c) => !takenIds.has(c.id));
  let toBook = fillTo - s.bookings.reduce((n, b) => n + b.qty, 0);
  for (const client of pool) {
    if (toBook <= 0) break;
    const qty = rnd() < 0.15 && spots >= 2 ? 2 : 1;
    const full = spots <= 0;
    const cp = clientPacks.find((p) => p.clientId === client.id && p.creditsLeft >= qty && p.expiresAt > new Date());
    if (cp && !full) {
      cp.creditsLeft -= qty;
      await db.clientPackage.update({ where: { id: cp.id }, data: { creditsLeft: { decrement: qty } } });
    }
    await db.booking.create({
      data: {
        tenantId: T, sessionId: s.id, clientId: client.id, qty: full ? 1 : qty,
        status: full ? "WAITLIST" : "BOOKED",
        paymentMethod: full ? null : cp ? "package_credit" : "at_studio",
        clientPackageId: full ? null : cp?.id ?? null,
      },
    });
    if (full) waitlisted++; else { spots -= qty; futureBookings++; }
    toBook -= full ? 1 : qty;
  }
}

// ── Expenses over the past two months ─────────────────────────────────
const EXPENSES = [
  ["Rent", 1800], ["Rent", 1800], ["Salaries", 2400], ["Salaries", 2400],
  ["Utilities", 160], ["Utilities", 145], ["Equipment", 420], ["Marketing", 250],
  ["Marketing", 180], ["Supplies", 95], ["Supplies", 60], ["Software", 49], ["Software", 49], ["Other", 75],
];
for (const [i, [category, amount]] of EXPENSES.entries()) {
  await db.expense.create({
    data: { tenantId: T, category, amount, date: new Date(Date.now() - between(1, 56) * 86400_000), note: i === 6 ? "Replacement reformer springs" : null },
  });
}

console.log(JSON.stringify({
  clients: clients.length, packagesSold: clientPacks.length, pastSessions, checkins, dropinOrders,
  futureSessionsMaterialised: made, futureBookings, waitlisted, expenses: EXPENSES.length,
}, null, 2));
await db.$disconnect();
