import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const existing = await db.user.findFirst({ where: { role: "SUPERADMIN" } });
  if (existing) { console.log("superadmin exists:", existing.email); return; }
  const u = await db.user.create({ data: { email: "owner@nexis-hq.com", name: "Platform Owner", role: "SUPERADMIN", passwordHash: await bcrypt.hash("zQh8c1nQRYhnMEAVVK", 10) } });
  console.log("superadmin created:", u.email);
}
main().finally(() => db.$disconnect());
