import type { Metadata } from "next";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";

// Per-studio SEO for every booking/portal page (Wave 13 P3).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant) return { title: "Book a class" };
  const w = (tenant.website ?? {}) as { tagline?: string; about?: string; heroImage?: string };
  const description = (w.about || w.tagline || `Book classes at ${tenant.name} — see this week's schedule and reserve your spot in under a minute.`).slice(0, 160);
  return {
    title: { default: `Book a Class — ${tenant.name}`, template: `%s — ${tenant.name}` },
    description,
    openGraph: {
      title: `Book a Class — ${tenant.name}`,
      description,
      type: "website",
      siteName: tenant.name,
      ...(w.heroImage ? { images: [{ url: w.heroImage }] } : {}),
    },
  };
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
