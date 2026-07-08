import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/api/login", "/signup", "/api/signup", "/book", "/s", "/api/public", "/api/cron"];

const BASE_HOSTS = ["new.nexis.revsports.ca", "nexis.revsports.ca", "localhost", "127.0.0.1"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Tenant subdomains (<slug>.nexis.revsports.ca) — cutover-day feature,
  // behind TENANT_SUBDOMAINS=1. nginx keeps routing these to the old
  // system until the flip, so this is inert in production until then.
  const BASE = "nexis.revsports.ca";
  if (process.env.TENANT_SUBDOMAINS === "1" && host.endsWith(`.${BASE}`)) {
    const slug = host.slice(0, -(BASE.length + 1));
    if (slug && !["new", "www", "hq"].includes(slug)) {
      if (pathname === "/") return NextResponse.rewrite(new URL(`/s/${slug}`, req.url));
      if (pathname === "/book") return NextResponse.rewrite(new URL(`/book/${slug}`, req.url));
      if (pathname === "/book/me") return NextResponse.rewrite(new URL(`/book/${slug}/me`, req.url));
    }
  }

  // Custom domains: a studio's own domain serves their public website at "/".
  if (host && !BASE_HOSTS.includes(host) && !host.endsWith(`.${BASE}`)) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/s/~${host}`, req.url));
    }
  }
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("nx_session")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!));
      // Instructors only get the operational pages, not money or settings.
      const role = payload.role as string;
      const RESTRICTED = ["/pos", "/products", "/invoices", "/analytics", "/settings", "/billing", "/team", "/welcome", "/expenses"];
      if (role === "INSTRUCTOR" && RESTRICTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/schedule", req.url));
      }
      return NextResponse.next();
    } catch {
      // fall through to login redirect
    }
  }
  const login = new URL("/login", req.url);
  return NextResponse.redirect(login);
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js|woff2?)).*)"],
};
