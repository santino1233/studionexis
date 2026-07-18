import { NextResponse } from "next/server";
import { materialiseAll } from "@/lib/blueprint";
import { db } from "@/lib/db";

// Daily cron: roll every active blueprint's recurring slots forward ~4 weeks,
// and sweep page-view retention (~6 months) — moved off the public beacon.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const created = await materialiseAll();
  const pruned = await db.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 180 * 86400_000) } } }).then((r) => r.count).catch(() => 0);
  return NextResponse.json({ ok: true, created, pruned });
}
