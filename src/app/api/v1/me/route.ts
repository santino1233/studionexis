import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/api-auth";
import { publicSiteUrl } from "@/lib/site-url";

export async function GET(req: Request) {
  const a = await apiTenant(req);
  if ("response" in a) return a.response;
  const t = a.tenant;
  return NextResponse.json({
    id: t.id, name: t.name, slug: t.slug, currency: t.currency, timezone: t.timezone,
    plan: t.plan, bookingUrl: publicSiteUrl(t, "/book"),
  });
}
