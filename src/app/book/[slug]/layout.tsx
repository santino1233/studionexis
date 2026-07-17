import type { Metadata } from "next";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { Pixels } from "@/components/pixels";
import { ChatWidget } from "@/components/chat-widget";

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

export default async function BookLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantBySlugOrDomain(slug);
  return (
    <>
      {tenant && <Pixels policies={tenant.policies} />}
      {children}
      {tenant && <ChatWidget slug={slug} brand={tenant.brandColor || "#F97316"} studio={tenant.name} />}
    </>
  );
}
