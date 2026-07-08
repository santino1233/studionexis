import { db } from "@/lib/db";

// Public pages take a `slug` param that is either a studio slug or, when
// the request arrived on a customer's own domain (middleware rewrites
// "/" → "/s/~<host>"), a "~"-prefixed hostname.
export async function tenantBySlugOrDomain(param: string) {
  if (param.startsWith("~")) {
    return db.tenant.findFirst({ where: { customDomain: decodeURIComponent(param.slice(1)).toLowerCase() } });
  }
  return db.tenant.findUnique({ where: { slug: param } });
}
