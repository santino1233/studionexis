import { NextResponse } from "next/server";
import { materialiseAll } from "@/lib/blueprint";

// Daily cron: roll every active blueprint's recurring slots forward ~4 weeks.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const created = await materialiseAll();
  return NextResponse.json({ ok: true, created });
}
