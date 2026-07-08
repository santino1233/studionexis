import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "nx_customer";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export type CustomerSession = { clientId: string; tenantId: string; slug: string };

export async function createCustomerSession(s: CustomerSession) {
  const token = await new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 3600 });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as CustomerSession;
  } catch {
    return null;
  }
}

export async function destroyCustomerSession() {
  (await cookies()).delete(COOKIE);
}
