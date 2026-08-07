import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Live client search for the shell/global quick-search (GET, JSON).
// Session-guarded + tenant-scoped. Read-only: matches the same name/phone/email
// fields the /clients list page filters on, and enriches each hit with active
// package credits + last visit so the dropdown can show useful context (mirrors
// the Soul Pilates client quick-search results). Returns a bounded list.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ total: 0, clients: [] });

  const where = {
    tenantId: session.tenantId,
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const now = new Date();
  const [total, rows] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        lastVisitAt: true,
        packages: {
          where: { frozen: false, creditsLeft: { gt: 0 }, expiresAt: { gt: now } },
          select: { creditsLeft: true },
        },
      },
    }),
  ]);

  const clients = rows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    tags: c.tags.slice(0, 2),
    lastVisitAt: c.lastVisitAt,
    credits: c.packages.reduce((n, p) => n + p.creditsLeft, 0),
  }));

  return NextResponse.json({ total, clients });
}
