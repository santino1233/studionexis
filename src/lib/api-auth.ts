import { NextResponse } from "next/server";
import type { Tenant } from "@prisma/client";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

// Public REST API v1 auth (Wave 15): Authorization: Bearer nx_live_…
// Keys are per-studio (Settings → API). 120 requests/min per key.

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function apiTenant(req: Request): Promise<{ tenant: Tenant } | { response: NextResponse }> {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key || !key.startsWith("nx_live_")) {
    return { response: apiError(401, "unauthorized", "Missing or malformed API key. Send it as: Authorization: Bearer nx_live_…") };
  }
  if (!rateLimit(req, `apiv1:${key.slice(0, 20)}`, 120, 60)) {
    return { response: apiError(429, "rate_limited", "Too many requests — limit is 120/minute per key.") };
  }
  const tenant = await db.tenant.findUnique({ where: { apiKey: key } });
  if (!tenant) return { response: apiError(401, "unauthorized", "Unknown API key.") };
  if (tenant.status === "SUSPENDED") return { response: apiError(403, "suspended", "This studio account is suspended.") };
  return { tenant };
}

export function pageParams(req: Request, maxLimit = 100) {
  const url = new URL(req.url);
  const limit = Math.min(maxLimit, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  return { url, limit, offset };
}
