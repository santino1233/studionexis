import { db } from "@/lib/db";

// Public pages take a `slug` param that is either a studio slug or, when
// the request arrived on a customer's own domain (middleware rewrites
// "/" → "/s/~<host>"), a "~"-prefixed hostname.
export async function tenantBySlugOrDomain(param: string) {
  if (param.startsWith("~")) {
    const host = decodeURIComponent(param.slice(1)).toLowerCase();
    const exact = await db.tenant.findFirst({ where: { customDomain: host } });
    if (exact) return exact;
    // www.example.com and example.com should both find the studio.
    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    return db.tenant.findFirst({ where: { customDomain: alt } });
  }
  return db.tenant.findUnique({ where: { slug: param } });
}
