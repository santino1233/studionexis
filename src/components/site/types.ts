export type SitePackage = { name: string; price: string; credits: number; validityDays: number };
export type SiteSession = { id: string; name: string; day: string; time: string; color: string; instructor?: string };

export type SiteData = {
  name: string;
  slug: string;
  brand: string;
  tagline: string;
  about: string;
  address: string;
  phone: string;
  instagram: string;
  hours: string;
  hero: string;
  gallery: string[];
  mapSrc: string | null;
  packages: SitePackage[];
  sessions: SiteSession[];
  bookHref: string;
  portalHref: string;
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
