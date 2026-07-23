// Create a COMPLETE demo studio from scratch on STAGING — team, class types,
// packages, products, clients, past + upcoming classes, bookings, credits,
// paid orders, expenses and vouchers. Everything a screenshot/demo needs.
//
// Safety: hard-refuses unless DATABASE_URL points at nexis_staging.
// Re-runnable: deletes and rebuilds the tenant identified by SLUG.
//
// Usage: DATABASE_URL=<staging> DEMO_PASS='...' node scripts/seed-demo-studio.mjs
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL ?? "";
if (!/nexis_staging/.test(url)) {
  console.error("REFUSING: DATABASE_URL is not nexis_staging.");
  process.exit(1);
}
const PASS = process.env.DEMO_PASS;
if (!PASS) { console.error("Set DEMO_PASS"); process.exit(1); }

const SLUG = process.env.SLUG || "demo-studio";
const NAME = process.env.STUDIO_NAME || "Lumen Pilates";
const TZ = "Asia/Bangkok";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const pw = bcrypt.hashSync(PASS, 10);

// deterministic PRNG so re-runs produce the same dataset
let s = 7;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
// local wall time in TZ -> UTC instant (same approach as lib/tz)
const at = (d, hh, mm = 0) => new Date(new Date(d).setUTCHours(hh - 7, mm, 0, 0));
const day = (offset) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + offset); return d; };

// ── fresh start ────────────────────────────────────────────────────────
const existing = await db.tenant.findUnique({ where: { slug: SLUG } });
if (existing) { await db.tenant.delete({ where: { id: existing.id } }); }

const tenant = await db.tenant.create({
  data: {
    slug: SLUG, name: NAME, currency: "USD", timezone: TZ, plan: "growth",
    status: "ACTIVE", brandColor: "#F97316",
    policies: { cancelHours: 12, payAtStudio: true },
    website: { published: true, template: "serene", tagline: "Move well. Feel better." },
  },
});
const T = tenant.id;

// ── team ───────────────────────────────────────────────────────────────
const owner = await db.user.create({ data: { tenantId: T, email: `owner@${SLUG}.com`, passwordHash: pw, name: "Alex Rivera", role: "OWNER", phone: "555-0100" } });
const manager = await db.user.create({ data: { tenantId: T, email: `manager@${SLUG}.com`, passwordHash: pw, name: "Priya Shah", role: "MANAGER", phone: "555-0101", baseSalary: 2800 } });
const desk = await db.user.create({ data: { tenantId: T, email: `reception@${SLUG}.com`, passwordHash: pw, name: "Ben Okafor", role: "STAFF", phone: "555-0102", hourlyRate: 14 } });
const instructors = [];
for (const [n, mode, rate] of [["Mia Chen", "percent", 30], ["Sofia Tran", "percent", 25], ["Marco Silva", "fixed_per_class", 0]]) {
  instructors.push(await db.user.create({
    data: {
      tenantId: T, email: `${n.split(" ")[0].toLowerCase()}@${SLUG}.com`, passwordHash: pw, name: n,
      role: "INSTRUCTOR", commissionMode: mode, commissionRate: rate,
      commissionConfig: mode === "fixed_per_class" ? { fixed: 35 } : {},
    },
  }));
}

// ── class types with recurring weekly slots ───────────────────────────
const CT = [
  { name: "Reformer Flow", format: "Reformer", difficulty: "Moderate", price: 24, cap: 8, dur: 50, color: "#F97316", slots: [{ day: 0, time: "07:00" }, { day: 2, time: "07:00" }, { day: 4, time: "18:00" }], benefits: ["Core strength", "Posture"], equipment: ["Reformer"] },
  { name: "Mat Pilates", format: "Mat", difficulty: "All levels", price: 18, cap: 14, dur: 55, color: "#8B5CF6", slots: [{ day: 1, time: "09:30" }, { day: 3, time: "09:30" }, { day: 5, time: "10:00" }], benefits: ["Mobility", "Core"], equipment: ["Mat"] },
  { name: "Barre Sculpt", format: "Barre", difficulty: "Athletic", price: 20, cap: 12, dur: 45, color: "#EC4899", slots: [{ day: 1, time: "18:00" }, { day: 4, time: "07:00" }], benefits: ["Endurance", "Tone"], equipment: ["Barre"] },
  { name: "Yoga Flow", format: "Yoga", difficulty: "Gentle", price: 16, cap: 16, dur: 60, color: "#22A565", slots: [{ day: 2, time: "18:30" }, { day: 6, time: "09:00" }], benefits: ["Flexibility", "Calm"], equipment: ["Mat"] },
  { name: "Private Reformer", format: "Reformer", difficulty: "All levels", price: 75, cap: 1, dur: 50, color: "#3B82F6", kind: "PRIVATE", slots: [] },
];
const types = [];
for (const c of CT) {
  types.push(await db.classType.create({
    data: {
      tenantId: T, name: c.name, format: c.format, difficulty: c.difficulty, color: c.color,
      kind: c.kind ?? "GROUP", durationMin: c.dur, capacity: c.cap, price: c.price,
      description: `${c.name} — ${c.difficulty.toLowerCase()} ${c.format.toLowerCase()} class.`,
      benefits: c.benefits ?? [], equipment: c.equipment ?? [], recurringSlots: c.slots,
      defaultInstructorId: instructors[types.length % instructors.length].id,
    },
  }));
}

// ── packages & products ───────────────────────────────────────────────
const packs = [];
for (const p of [
  { name: "Intro — 3 Classes", credits: 3, price: 45, validityDays: 30 },
  { name: "10-Class Pack", credits: 10, price: 200, validityDays: 90 },
  { name: "20-Class Pack", credits: 20, price: 360, validityDays: 180 },
  { name: "Unlimited Monthly", credits: 30, price: 149, validityDays: 30, interval: "month" },
]) packs.push(await db.package.create({ data: { tenantId: T, ...p } }));

const products = [];
for (const p of [
  { name: "Grip Socks", price: 12, stock: 40 },
  { name: "Water Bottle", price: 18, stock: 25 },
  { name: "Studio Tote", price: 26, stock: 12 },
  { name: "Resistance Band", price: 9, stock: 60 },
]) products.push(await db.product.create({ data: { tenantId: T, ...p } }));

await db.voucher.create({ data: { tenantId: T, code: "WELCOME10", kind: "percent", value: 10, maxUses: 100, usedCount: 12, active: true } }).catch(() => {});

// ── clients ───────────────────────────────────────────────────────────
const FIRST = ["Ava", "Liam", "Maya", "Noah", "Zoe", "Ethan", "Isla", "Lucas", "Nora", "Owen", "Ruby", "Leo", "Chloe", "Kai", "Elena", "Jonah", "Freya", "Milo", "Sara", "Theo", "Iris", "Felix", "Luna", "Hugo", "Mila", "Jasper", "Elsie", "Rex"];
const LAST = ["Bennett", "Carter", "Rodriguez", "Patel", "Chen", "Brooks", "Murphy", "Reed", "Hayes", "Fletcher", "Nguyen", "Silva", "Okafor", "Dubois", "Kowalski"];
const CHAN = ["instagram", "walk-in", "referral", "google", "facebook"];
const clients = [];
for (let i = 0; i < 48; i++) {
  const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
  clients.push(await db.client.create({
    data: {
      tenantId: T, name,
      email: `${name.split(" ")[0].toLowerCase()}${i}@example.com`,
      phone: `555-${String(1000 + i)}`,
      channel: pick(CHAN),
      tags: rnd() > 0.75 ? ["vip"] : rnd() > 0.6 ? ["new"] : [],
      memberSince: day(-int(20, 400)),
      birthday: rnd() > 0.5 ? day(-int(7000, 15000)) : null,
      notes: rnd() > 0.8 ? "Prefers morning classes." : null,
    },
  }));
}

// ── package purchases + paid orders ───────────────────────────────────
let orderNo = 1;
const clientPacks = [];
for (let i = 0; i < 30; i++) {
  const c = clients[i];
  const p = pick(packs);
  const when = day(-int(1, 60));
  const order = await db.order.create({
    data: {
      tenantId: T, clientId: c.id, number: orderNo++, total: p.price, method: pick(["cash", "card", "transfer"]),
      status: "PAID", createdAt: when,
      items: { create: [{ kind: "package", refId: p.id, label: p.name, qty: 1, unitPrice: p.price }] },
    },
  });
  clientPacks.push(await db.clientPackage.create({
    data: {
      tenantId: T, clientId: c.id, packageId: p.id,
      creditsLeft: int(1, p.credits), expiresAt: day(p.validityDays - int(0, 20)),
      pricePaid: p.price, createdAt: when,
    },
  }));
  if (rnd() > 0.6) {
    const prod = pick(products);
    await db.order.create({
      data: {
        tenantId: T, clientId: c.id, number: orderNo++, total: prod.price, method: pick(["cash", "card"]),
        status: "PAID", createdAt: day(-int(1, 45)),
        items: { create: [{ kind: "product", refId: prod.id, productId: prod.id, label: prod.name, qty: 1, unitPrice: prod.price }] },
      },
    });
  }
}

// ── sessions: 3 weeks past (completed) + 2 weeks ahead ────────────────
let past = 0, future = 0, bookings = 0;
for (let d = -21; d <= 14; d++) {
  const date = day(d);
  const dow = (date.getUTCDay() + 6) % 7; // Mon=0
  for (const ct of types) {
    for (const slot of ct.recurringSlots) {
      if (slot.day !== dow) continue;
      const [hh, mm] = slot.time.split(":").map(Number);
      const startsAt = at(date, hh, mm);
      const isPast = d < 0;
      const instructor = instructors[(types.indexOf(ct) + Math.abs(d)) % instructors.length];
      const session = await db.classSession.create({
        data: {
          tenantId: T, classTypeId: ct.id, instructorId: instructor.id,
          startsAt, endsAt: new Date(startsAt.getTime() + ct.durationMin * 60000),
          capacity: ct.capacity, status: isPast ? "COMPLETED" : "SCHEDULED", isPublic: true,
          ...(isPast ? { revenue: 0, instructorEarnings: 0 } : {}),
        },
      });
      isPast ? past++ : future++;
      // attendees
      const n = Math.min(ct.capacity, int(isPast ? 3 : 1, ct.capacity));
      const chosen = new Set();
      let revenue = 0;
      for (let k = 0; k < n; k++) {
        const c = clients[int(0, clients.length - 1)];
        if (chosen.has(c.id)) continue;
        chosen.add(c.id);
        const cp = clientPacks.find((x) => x.clientId === c.id);
        const usedCredit = !!cp && rnd() > 0.35;
        const status = isPast ? (rnd() > 0.12 ? "CHECKED_IN" : rnd() > 0.5 ? "NO_SHOW" : "LATE_CANCEL") : "BOOKED";
        await db.booking.create({
          data: {
            tenantId: T, sessionId: session.id, clientId: c.id, status, qty: 1,
            paymentMethod: usedCredit ? "package_credit" : "at_studio",
            ...(usedCredit ? { clientPackageId: cp.id } : {}),
            createdAt: new Date(startsAt.getTime() - int(1, 6) * 86400000),
          },
        });
        bookings++;
        if (isPast && status === "CHECKED_IN") revenue += usedCredit ? Number(ct.price) * 0.8 : Number(ct.price);
      }
      if (isPast) {
        const earn = instructor.commissionMode === "fixed_per_class" ? 35 : (revenue * Number(instructor.commissionRate)) / 100;
        await db.classSession.update({ where: { id: session.id }, data: { revenue, instructorEarnings: earn } });
      }
    }
  }
}

// ── expenses ──────────────────────────────────────────────────────────
for (const [cat, lo, hi] of [["Rent", 2400, 2400], ["Utilities", 180, 320], ["Equipment", 90, 600], ["Marketing", 120, 480], ["Supplies", 40, 180], ["Software", 60, 140]]) {
  for (let m = 0; m < 3; m++) {
    await db.expense.create({ data: { tenantId: T, category: cat, amount: int(lo, hi), note: `${cat} — month ${m + 1}`, date: day(-m * 30 - int(1, 20)) } });
  }
}

// ── set the last-visit stamp so client lists look alive ───────────────
for (const c of clients.slice(0, 34)) {
  await db.client.update({ where: { id: c.id }, data: { lastVisitAt: day(-int(0, 21)) } });
}

const counts = {
  clients: await db.client.count({ where: { tenantId: T } }),
  staff: await db.user.count({ where: { tenantId: T } }),
  classTypes: await db.classType.count({ where: { tenantId: T } }),
  sessions: await db.classSession.count({ where: { tenantId: T } }),
  bookings: await db.booking.count({ where: { tenantId: T } }),
  orders: await db.order.count({ where: { tenantId: T } }),
  packages: await db.package.count({ where: { tenantId: T } }),
  products: await db.product.count({ where: { tenantId: T } }),
  expenses: await db.expense.count({ where: { tenantId: T } }),
  clientPackages: await db.clientPackage.count({ where: { tenantId: T } }),
};
console.log(JSON.stringify({ studio: NAME, slug: SLUG, ownerEmail: owner.email, past, future, ...counts }, null, 2));
await db.$disconnect();
