import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { moneyFormatter } from "@/lib/tenant";
import { dayKeyInTz, timeInTz } from "@/lib/tz";
import { mapEmbedSrc, TEMPLATE_IDS, SECTION_IDS, type SiteData, type TemplateId, type SectionId, type SiteQuote, type SiteFaq } from "@/components/site/types";
import { difficultyLabel } from "@/lib/class-config";
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

  const w = (tenant.website ?? {}) as Record<string, string> & {
    galleryImages?: string[];
    why?: string[];
    testimonials?: SiteQuote[];
    faqs?: SiteFaq[];
    sections?: Partial<Record<SectionId, boolean>>;
    teamBios?: Record<string, { bio?: string; photo?: string }>;
  };
  const fmt = moneyFormatter(tenant.currency);

  const [packages, sessions, classTypes, instructors] = await Promise.all([
    db.package.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { price: "asc" }, take: 6 }),
    db.classSession.findMany({
      where: { tenantId: tenant.id, status: "SCHEDULED", isPublic: true, startsAt: { gt: new Date(), lt: new Date(Date.now() + 7 * 86400_000) } },
      include: { classType: true, instructor: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    db.classType.findMany({ where: { tenantId: tenant.id, active: true, kind: "GROUP" }, orderBy: { name: "asc" }, take: 6 }),
    db.user.findMany({ where: { tenantId: tenant.id, active: true, role: "INSTRUCTOR" }, orderBy: { name: "asc" }, take: 6 }),
  ]);

  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number };
  const cancelHours = pol.cancelWindowGroupHours ?? 3;

  const data: SiteData = {
    name: tenant.name,
    slug,
    brand: tenant.brandColor || "#F97316",
    tagline: w.tagline ?? "",
    about: w.about ?? "",
    philosophy: w.philosophy || `At ${tenant.name}, we believe strength is built with patience and precision. Every class blends classical Pilates principles with modern movement science — small groups, hands-on coaching, and programming that respects where your body is today.`,
    why: w.why?.length ? w.why : ["Small classes with real, hands-on coaching", "Certified instructors who know your name", "Programs for every body and every level", "A calm, welcoming space to reset"],
    address: w.address ?? "",
    phone: w.phoneNumber ?? "",
    instagram: w.instagram ?? "",
    facebook: w.facebook ?? "",
    tiktok: w.tiktok ?? "",
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
    classes: classTypes.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      format: c.format ?? "",
      difficulty: difficultyLabel(c.difficulty),
      color: c.color,
      image: c.heroImage ?? "",
      benefits: c.benefits,
      price: fmt.format(Number(c.price)),
    })),
    team: instructors.map((u) => ({
      name: u.name,
      role: "Instructor",
      bio: w.teamBios?.[u.id]?.bio ?? "",
      photo: w.teamBios?.[u.id]?.photo ?? "",
    })),
    testimonials: w.testimonials ?? [],
    faqs: w.faqs?.length ? w.faqs : [
      { q: "I've never done Pilates — can I still join?", a: "Absolutely. Most of our classes are open to all levels and the instructor will give you options for every exercise. If you're brand new, a Gentle or All-levels class is the perfect place to start." },
      { q: "What should I bring or wear?", a: "Comfortable clothes you can move in and a water bottle. Grip socks are recommended for equipment classes — you can bring your own or buy a pair at the studio." },
      { q: "How do I book and pay?", a: "Book online in under a minute — pick a class, choose your spot, and pay with a class package or at the studio. You can also buy multi-class packages for a better rate." },
      { q: "What's the cancellation policy?", a: `Life happens! Cancel at least ${cancelHours} hour${cancelHours === 1 ? "" : "s"} before class starts and your credit is returned automatically.` },
    ],
    enabled: Object.fromEntries(SECTION_IDS.map((id) => [id, w.sections?.[id] ?? true])) as Record<SectionId, boolean>,
    bookHref: `/book/${slug}`,
    portalHref: `/book/${slug}/account`,
  };

  const chosen = (preview && TEMPLATE_IDS.includes(preview as TemplateId) ? preview : w.template) as TemplateId;
  const Template = TEMPLATES[chosen] ?? Boutique;
  return <>{Template(data)}</>;
}
