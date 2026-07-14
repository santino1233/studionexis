import { NextResponse } from "next/server";
import { renewMemberships } from "@/lib/memberships";

// Daily cron: roll lapsed monthly/yearly memberships into their next period.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const renewed = await renewMemberships();
  return NextResponse.json({ ok: true, renewed });
}
