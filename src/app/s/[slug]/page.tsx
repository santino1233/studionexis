import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { mapEmbedSrc, TEMPLATE_IDS, type SiteData, type TemplateId } from "@/components/site/types";
import { Boutique } from "@/components/site/templates/boutique";
import { Luxury } from "@/components/site/templates/luxury";
import { Minimal } from "@/components/site/templates/minimal";
import { Serene } from "@/components/site/templates/serene";
import { Bold } from "@/components/site/templates/bold";

export const dynamic = "force-dynamic";

const TEMPLATES: Record<TemplateId, (d: SiteData) => React.ReactNode> = {
  boutique: Boutique,
  luxury: Luxury,
  minimal: Minimal,
  serene: Serene,
  bold: Bold,
};

export default async function StudioSite({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const w = (tenant.website ?? {}) as Record<string, string> & { galleryImages?: string[] };
  const fmt = moneyFormatter(tenant.currency);

  const [packages, sessions] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" }, take: 6 }),
    db.classSession.findMany({
      where: { tenantId: tenant.id, status: "SCHEDULED", startsAt: { gt: new Date(), lt: new Date(Date.now() + 7 * 86400_000) } },
      include: { classType: true, instructor: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const data: SiteData = {
    name: tenant.name,
    slug,
    brand: tenant.brandColor || "#F97316",
    tagline: w.tagline ?? "",
    about: w.about ?? "",
    address: w.address ?? "",
    phone: w.phoneNumber ?? "",
    instagram: w.instagram ?? "",
    hours: w.hours ?? "",
    hero: w.heroImage || "/studio/hero.jpg",
    gallery: w.galleryImages?.length
      ? w.galleryImages
      : ["gallery1", "gallery2", "gallery3", "gallery4"].map((g) => `/studio/${g}.jpg`),
    mapSrc: mapEmbedSrc(w.mapUrl, w.address, tenant.name),
    packages: packages.map((p) => ({ name: p.name, price: fmt.format(Number(p.price)), credits: p.credits, validityDays: p.validityDays })),
    sessions: sessions.map((s) => {
      const day = dayKeyInTz(s.startsAt, tenant.timezone) === dayKeyInTz(new Date(), tenant.timezone)
        ? "Today"
        : s.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" });
      return { id: s.id, name: s.classType.name, day, time: timeInTz(s.startsAt, tenant.timezone), color: s.classType.color, instructor: s.instructor?.name.split(" ")[0] };
    }),
    bookHref: `/book/${slug}`,
    portalHref: `/book/${slug}/account`,
  };

  const chosen = (preview && TEMPLATE_IDS.includes(preview as TemplateId) ? preview : w.template) as TemplateId;
  const Template = TEMPLATES[chosen] ?? Boutique;
  return <>{Template(data)}</>;
}
