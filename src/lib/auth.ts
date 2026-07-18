import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "nx_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export type Session = {
  userId: string;
  tenantId: string;
  role: string;
  name: string;
};

export async function createSession(s: Session) {
  const token = await new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export { COOKIE as SESSION_COOKIE };

// ── Login verification (2FA) ────────────────────────────────────────────────
// A short-lived signed cookie holds the pending login between the password step
// and the code step, so we never store transient codes in the database.
const PENDING = "nx_2fa";
const TRUST = "nx_trust";

export type Pending2FA = { userId: string; tenantId: string; role: string; name: string; codeHash: string; channel: "email" | "sms"; contact: string };

export async function setPending2FA(p: Pending2FA) {
  const token = await new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(secret());
  (await cookies()).set(PENDING, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
}
export async function getPending2FA(): Promise<Pending2FA | null> {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload as unknown as Pending2FA; } catch { return null; }
}
export async function clearPending2FA() {
  (await cookies()).delete(PENDING);
}

// "Trust this device for 30 days" — a per-user signed cookie that skips 2FA.
export async function trustDevice(userId: string) {
  const token = await new SignJWT({ userId, kind: "trust" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
  (await cookies()).set(TRUST, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
}
export async function isTrustedDevice(userId: string): Promise<boolean> {
  const token = (await cookies()).get(TRUST)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "trust" && payload.userId === userId;
  } catch { return false; }
}
