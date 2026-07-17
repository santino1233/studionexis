import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";

// Backing store for the advanced (GrapesJS) editor. The custom page lives in
// website.custom = { html, css, enabled } and replaces the template on /s/[slug]
// while enabled. Scripts are stripped server-side — pixels stay the only JS.

function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export async function GET() {
  const auth = await getSession();
  if (!auth || (auth.role !== "OWNER" && auth.role !== "MANAGER")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const tenant = await getCurrentTenant();
  const w = (tenant.website ?? {}) as { custom?: { html?: string; css?: string; enabled?: boolean } };
  return NextResponse.json({ html: w.custom?.html ?? "", css: w.custom?.css ?? "", enabled: !!w.custom?.enabled });
}

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || (auth.role !== "OWNER" && auth.role !== "MANAGER")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const tenant = await getCurrentTenant();
  let body: { html?: string; css?: string; enabled?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  const w = (tenant.website ?? {}) as Record<string, unknown>;
  const prev = (w.custom ?? {}) as { html?: string; css?: string; enabled?: boolean };
  const custom = {
    html: body.html !== undefined ? sanitize(String(body.html)).slice(0, 400_000) : (prev.html ?? ""),
    css: body.css !== undefined ? String(body.css).slice(0, 200_000) : (prev.css ?? ""),
    enabled: body.enabled !== undefined ? !!body.enabled : !!prev.enabled,
  };
  await db.tenant.update({ where: { id: tenant.id }, data: { website: { ...w, custom } as never } });
  return NextResponse.json({ ok: true, enabled: custom.enabled });
}
