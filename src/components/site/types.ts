export type SitePackage = { name: string; price: string; credits: number; validityDays: number };
export type SiteSession = { id: string; name: string; day: string; time: string; color: string; instructor?: string };
export type SiteClass = { id: string; name: string; description: string; format: string; difficulty: string; color: string; image: string; benefits: string[]; price: string };
export type SiteTeam = { name: string; role: string; bio: string; photo: string };
export type SiteQuote = { quote: string; name: string };
export type SiteFaq = { q: string; a: string };

// Every togglable block of the public site, in render order (video/Wave 11 builder).
export const SECTION_IDS = ["about", "classes", "schedule", "team", "pricing", "testimonials", "gallery", "faq", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export const SECTION_LABELS: Record<SectionId, string> = {
  about: "About & philosophy", classes: "Class showcase", schedule: "This week's schedule", team: "Meet the team",
  pricing: "Packages & pricing", testimonials: "Testimonials", gallery: "Photo gallery", faq: "FAQ", contact: "Contact & map",
};

export type SiteData = {
  name: string;
  slug: string;
  brand: string;
  tagline: string;
  about: string;
  philosophy: string;
  why: string[];
  address: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  hours: string;
  hero: string;
  gallery: string[];
  mapSrc: string | null;
  packages: SitePackage[];
  sessions: SiteSession[];
  classes: SiteClass[];
  team: SiteTeam[];
  testimonials: SiteQuote[];
  faqs: SiteFaq[];
  enabled: Record<SectionId, boolean>;
  bookHref: string;
  portalHref: string;
};

// A template's visual language, consumed by the shared section library so
// every section inherits the template's look without duplicating markup.
export type SiteSkin = {
  bg: string; // page background
  bg2: string; // alternate band background
  fg: string; // main text
  line: string; // hairline borders
  cardBg: string;
  serif: boolean;
  radius: string; // card corner radius, e.g. "24px"
  dark: boolean; // dark-scheme template
};

export const TEMPLATE_IDS = ["boutique", "luxury", "minimal", "serene", "bold"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_META: Record<TemplateId, { name: string; vibe: string; bg: string; fg: string; serif: boolean }> = {
  boutique: { name: "Boutique", vibe: "Warm, editorial, personal", bg: "#FAF5EE", fg: "#2A241D", serif: true },
  luxury: { name: "Luxury", vibe: "Dark, refined, exclusive", bg: "#121110", fg: "#EFEAE2", serif: true },
  minimal: { name: "Minimal", vibe: "White space, big type", bg: "#FFFFFF", fg: "#111113", serif: false },
  serene: { name: "Serene", vibe: "Soft, calm, natural", bg: "#F2F4EF", fg: "#2B322B", serif: false },
  bold: { name: "Bold", vibe: "Loud color, high energy", bg: "#17181C", fg: "#FFFFFF", serif: false },
};

// Turn whatever the studio pasted (share link, place link, embed link, or a
// plain address) into an embeddable Google Maps src.
export function mapEmbedSrc(mapUrl: string | undefined, address: string | undefined, name: string): string | null {
  const raw = (mapUrl ?? "").trim();
  if (!raw && !address) return null;
  if (raw.includes("/maps/embed")) return raw;
  let q = address || name;
  const place = raw.match(/\/place\/([^/?]+)/);
  if (place) q = decodeURIComponent(place[1].replace(/\+/g, " "));
  else if (raw && !/^https?:/i.test(raw)) q = raw;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}
