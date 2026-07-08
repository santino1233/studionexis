import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: "dev-studio" },
    update: {},
    create: {
      slug: "dev-studio",
      name: "Dev Studio",
      currency: "USD",
      timezone: "Asia/Bangkok",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      classTypes: {
        create: [
          { name: "Reformer Flow", color: "#F97316", capacity: 8, durationMin: 55, price: 25 },
          { name: "Mat Pilates", color: "#8B5CF6", capacity: 12, durationMin: 50, price: 18 },
          { name: "Private Session", color: "#22A565", kind: "PRIVATE", capacity: 1, durationMin: 60, price: 60 },
        ],
      },
      packages: {
        create: [
          { name: "10-Class Pack", credits: 10, validityDays: 90, price: 220 },
          { name: "Intro — 3 Classes", credits: 3, validityDays: 30, price: 45 },
        ],
      },
      clients: {
        create: [
          { name: "Ava Chen", phone: "555-0101", email: "ava@example.com", channel: "instagram" },
          { name: "Maya Torres", phone: "555-0102", email: "maya@example.com", channel: "walk-in" },
          { name: "Linh Nguyen", phone: "555-0103", email: "linh@example.com", channel: "zalo" },
        ],
      },
    },
  });
  console.log("seeded tenant:", tenant.slug, tenant.id);
}

main().finally(() => db.$disconnect());
