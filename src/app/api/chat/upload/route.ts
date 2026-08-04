import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { appsOf } from "@/lib/webhooks";

// Shared photo-attachment upload for every chat surface. Returns { url } that
// callers include as the message's `image`. Files land in the target tenant's
// uploads folder and are served publicly by /api/media/[tenant]/[file].
import { UPLOADS_ROOT } from "@/lib/uploads";
const ROOT = UPLOADS_ROOT;
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!rateLimit(req, "chatupload", 20, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "").trim();

  let tenantId: string | null = null;
  if (slug) {
    // Public visitor on a studio's site — no session.
    const tenant = await tenantBySlugOrDomain(slug);
    if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (appsOf(tenant.policies).chatDisabled) return NextResponse.json({ error: "disabled" }, { status: 403 });
    tenantId = tenant.id;
  } else {
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (auth.role === "SUPERADMIN") {
      // HQ replying into a studio's support chat — store under that studio.
      const target = String(form.get("tenantId") ?? "").trim();
      const t = target ? await db.tenant.findUnique({ where: { id: target } }) : null;
      if (!t) return NextResponse.json({ error: "bad_tenant" }, { status: 400 });
      tenantId = t.id;
    } else {
      if (auth.role === "INSTRUCTOR") return NextResponse.json({ error: "forbidden" }, { status: 403 });
      tenantId = auth.tenantId;
    }
  }

  const f = form.getAll("file").find((x): x is File => x instanceof File && x.size > 0);
  const ext = f ? TYPES[f.type] : undefined;
  if (!f || !ext) return NextResponse.json({ error: "type", message: "Use a JPG, PNG or WebP image." }, { status: 422 });
  if (f.size > MAX_BYTES) return NextResponse.json({ error: "size", message: "Images must be under 8 MB." }, { status: 422 });

  await mkdir(path.join(ROOT, tenantId), { recursive: true });
  const name = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await writeFile(path.join(ROOT, tenantId, name), Buffer.from(await f.arrayBuffer()));
  return NextResponse.json({ url: `/api/media/${tenantId}/${name}` });
}
