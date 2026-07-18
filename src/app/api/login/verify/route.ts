import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { createSession, getPending2FA, setPending2FA, clearPending2FA, trustDevice } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { homeFor } from "@/lib/access";
import { generateCode, hashCode, sendLoginCode } from "@/lib/login-verify";

export async function POST(req: Request) {
  if (!rateLimit(req, "login2fa", 10, 60)) {
    return new NextResponse("Too many attempts — slow down and try again shortly.", { status: 429 });
  }
  const pending = await getPending2FA();
  if (!pending) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();

  // Resend — issue a fresh code on the same channel.
  if (String(form.get("resend")) === "1") {
    const tenant = await db.tenant.findUnique({ where: { id: pending.tenantId } });
    if (tenant) {
      const code = generateCode();
      await sendLoginCode(tenant, { name: pending.name }, pending.channel, pending.contact, code);
      await setPending2FA({ ...pending, codeHash: hashCode(code) });
    }
    return NextResponse.redirect(externalUrl(req, "/login/verify"), 303);
  }

  const code = String(form.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code) || hashCode(code) !== pending.codeHash) {
    return NextResponse.redirect(externalUrl(req, "/login/verify?error=code"), 303);
  }

  // Confirm the user is still valid before minting a session.
  const user = await db.user.findFirst({ where: { id: pending.userId, active: true } });
  if (!user || !user.tenantId) {
    await clearPending2FA();
    return NextResponse.redirect(externalUrl(req, "/login?error=1"), 303);
  }

  if (String(form.get("trust")) === "1") await trustDevice(user.id);
  await clearPending2FA();
  await createSession({ userId: user.id, tenantId: user.tenantId, role: user.role, name: user.name });
  return NextResponse.redirect(externalUrl(req, homeFor(user.role)), 303);
}
