import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";

// First-party page-view beacon (Wave 12 Z7). Anonymous: a random nx_vid
// cookie, path, and a classified source — no personal data.
function classifySource(utm: string, referrer: string, host: string): string {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!referrer) return "direct";
  try {
    const r = new URL(referrer).hostname.toLowerCase();
    if (r.includes(host)) return "internal";
    if (r.includes("instagram")) return "instagram";
    if (r.includes("facebook") || r.includes("fb.")) return "facebook";
    if (r.includes("tiktok")) return "tiktok";
    if (r.includes("google")) return "google";
    if (r.includes("bing")) return "bing";
    if (r.includes("youtube")) return "youtube";
    return r.replace(/^www\./, "").slice(0, 40);
  } catch {
    return "other";
  }
}

export async function POST(req: Request) {
  if (!rateLimit(req, "track", 60, 60)) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { slug?: string; path?: string; ref?: string; utm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const tenant = await tenantBySlugOrDomain(String(body.slug ?? ""));
  if (!tenant) return NextResponse.json({ ok: false }, { status: 404 });

  const cookies = Object.fromEntries((req.headers.get("cookie") ?? "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p.length === 2));
  const visitorId = /^[a-f0-9-]{36}$/.test(cookies.nx_vid ?? "") ? cookies.nx_vid : randomUUID();
  const path = String(body.path ?? "/").slice(0, 200);
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  const ua = req.headers.get("user-agent") ?? "";

  await db.pageView.create({
    data: {
      tenantId: tenant.id,
      visitorId,
      path,
      source: classifySource(String(body.utm ?? ""), String(body.ref ?? ""), host),
      referrer: String(body.ref ?? "").slice(0, 300) || null,
      device: /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop",
    },
  });
  // Occasional retention sweep: keep ~6 months of views.
  if (Math.random() < 0.01) {
    await db.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 180 * 86400_000) } } }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", `nx_vid=${visitorId}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return res;
}
