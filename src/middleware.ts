import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/api/login", "/signup", "/api/signup", "/book", "/s", "/api/public", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
