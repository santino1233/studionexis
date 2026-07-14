import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccess, homeFor } from "@/lib/access";

const PUBLIC = ["/login", "/api/login", "/signup", "/api/signup", "/book", "/s", "/api/public", "/api/cron", "/api/media", "/api/twilio", "/api/stripe"];

const BASE = "nexis.revsports.ca";
// Hosts that serve the (hidden) admin app. Everything else on the base
// domain is a tenant's customer world.
const ADMIN_HOSTS = [`app.${BASE}`, `new.${BASE}`, "localhost", "127.0.0.1"];
const RESERVED_SLUGS = ["app", "new", "www", "hq", "api", "mail", "admin"];

// Pretty customer paths on a tenant host → internal slugged routes.
const TENANT_ALIASES: Record<string, string> = {
  "/": "/s/{slug}",
  "/book": "/book/{slug}",
  "/packages": "/book/{slug}/packages",
  "/bookings": "/book/{slug}/bookings",
  "/my-packages": "/book/{slug}/my-packages",
  "/account": "/book/{slug}/account",
  "/book/me": "/book/{slug}/account",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // ── Super-admin portal on its own subdomain (Wave 12 Z9) ─────────────
  if (host === `hq.${BASE}`) {
    if (pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith(`/${process.env.HQ_PATH ?? "hq"}`)) {
      return NextResponse.next();
    }
    const url = new URL(`/${process.env.HQ_PATH ?? "hq"}${pathname === "/" ? "" : pathname}`, req.url);
    url.search = req.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // ── Tenant hosts: <slug>.BASE and custom domains ──────────────────────
  let slugParam: string | null = null;
  if (host.endsWith(`.${BASE}`) && !ADMIN_HOSTS.includes(host)) {
    const slug = host.slice(0, -(BASE.length + 1));
    if (slug && !RESERVED_SLUGS.includes(slug)) slugParam = slug;
  } else if (host && host !== BASE && !ADMIN_HOSTS.includes(host)) {
    slugParam = `~${host}`; // custom domain
  }

  if (slugParam) {
    const alias = TENANT_ALIASES[pathname];
    if (alias) {
      const url = new URL(alias.replaceAll("{slug}", slugParam), req.url);
      url.search = req.nextUrl.search; // keep ?preview=, ?d=, ?ok=…
      return NextResponse.rewrite(url);
    }
    // Class detail pages keep their pretty /class/<id> path.
    if (pathname.startsWith("/class/")) {
      const url = new URL(`/book/${slugParam}${pathname}`, req.url);
      url.search = req.nextUrl.search;
      return NextResponse.rewrite(url);
    }
    // Already-slugged public routes and APIs pass through.
    if (pathname.startsWith("/s/") || pathname.startsWith("/book/") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    // Everything else (login, dashboard, any admin surface) does not exist
    // on a customer domain — bounce to the studio site.
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ── Admin hosts: normal auth-gated app ────────────────────────────────
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("nx_session")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!));
      const role = payload.role as string;
      if (!canAccess(role, pathname)) {
        return NextResponse.redirect(new URL(homeFor(role), req.url));
      }
      return NextResponse.next();
    } catch {
      // fall through to login redirect
    }
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|studio/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js|woff2?)).*)"],
};
