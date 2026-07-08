import { redirect } from "next/navigation";

export default async function LegacyMePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/book/${slug}/account`);
}
