import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

const RESERVED = ["app", "new", "www", "hq", "api", "mail", "admin"];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Add a new location to the owner's account. Each location is its own fully
// isolated tenant (own clients, schedule, credits) grouped under one
// Organization — nothing is shared unless a sync is later turned on.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_locations");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const form = await req.formData();
  const label = String(form.get("label") ?? "").trim().slice(0, 60);
  const switchNow = String(form.get("switch") ?? "") === "1";
  if (!label) return NextResponse.redirect(externalUrl(req, "/locations?error=missing"), 303);

  const me = await db.user.findUnique({ where: { id: auth.userId } });
  const current = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!me || !current) return NextResponse.redirect(externalUrl(req, "/locations?error=1"), 303);

  const created = await db.$transaction(async (tx) => {
    // Promote the current studio into an Organization the first time.
    let orgId = current.organizationId;
    if (!orgId) {
      const org = await tx.organization.create({ data: { name: current.name, ownerEmail: me.email } });
      orgId = org.id;
      await tx.tenant.update({ where: { id: current.id }, data: { organizationId: orgId, locationLabel: current.locationLabel ?? "Main" } });
    }
    let base = slugify(`${current.slug}-${label}`) || slugify(label) || "location";
    if (RESERVED.includes(base)) base = `loc-${base}`;
    let slug = base;
    for (let i = 2; await tx.tenant.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

    // Carry the parent's BRAND-level website over so the new location launches
    // on-brand — but leave location-specific details (address, phone, hours,
    // photos, maps, socials, custom page) blank for the owner to fill in.
    const src = (current.website ?? {}) as Record<string, unknown>;
    const BRAND_KEYS = ["template", "tagline", "about", "philosophy", "why", "testimonials", "faqs"];
    const website: Record<string, unknown> = {};
    for (const k of BRAND_KEYS) if (src[k] !== undefined) website[k] = src[k];

    const t = await tx.tenant.create({
      data: {
        slug,
        name: `${current.name} — ${label}`,
        organizationId: orgId,
        locationLabel: label,
        currency: current.currency,
        timezone: current.timezone,
        language: current.language,
        brandColor: current.brandColor,
        logoUrl: current.logoUrl,
        plan: current.plan,
        status: "ACTIVE",
        website: website as never,
      },
    });
    // Same owner (same login) at the new location.
    await tx.user.create({
      data: { tenantId: t.id, email: me.email, name: me.name, passwordHash: me.passwordHash, role: "OWNER" },
    });
    return t;
  });

  const { audit } = await import("@/lib/hq");
  audit({ tenantId: current.id, actor: me.name, role: auth.role, action: "location-created", detail: `${label} (${created.slug})` });

  if (switchNow) {
    const owner = await db.user.findFirst({ where: { tenantId: created.id, email: me.email, active: true } });
    if (owner) {
      await createSession({ userId: owner.id, tenantId: created.id, role: owner.role, name: owner.name });
      return NextResponse.redirect(externalUrl(req, "/dashboard"), 303);
    }
  }
  return NextResponse.redirect(externalUrl(req, "/locations?created=1"), 303);
}
