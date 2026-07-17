import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/hq";
import { externalUrl } from "@/lib/request-url";

// One-time impersonation landing (Wave 16 B2): HQ mints a 60-second token,
// this route signs the superadmin in AS the studio owner. Every use is audited.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!));
    const user = await db.user.findUnique({ where: { id: String(payload.userId) } });
    if (!user || !user.tenantId || !user.active) throw new Error("gone");
    await createSession({ userId: user.id, tenantId: user.tenantId, role: user.role, name: `${user.name} (HQ)` });
    audit({ tenantId: user.tenantId, actor: "HQ", action: "impersonate-landed", detail: user.email });
    return NextResponse.redirect(externalUrl(req, "/dashboard"), 303);
  } catch {
    return NextResponse.redirect(externalUrl(req, "/login"), 303);
  }
}
