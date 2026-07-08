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
