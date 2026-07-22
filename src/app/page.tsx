import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Landing from "@/components/site/landing";
import { BASE_DOMAIN } from "@/lib/config";

// The apex host (nexis.revsports.ca / www) serves the public marketing site.
// The admin app lives on app.<base> — hitting "/" there means a signed-in
// user, so send them to their dashboard. Middleware already gates access.
const MARKETING_HOSTS = [BASE_DOMAIN, `www.${BASE_DOMAIN}`];

export const metadata: Metadata = {
  title: "Studio Nexis — Run your whole studio from one calm place",
  description:
    "The all-in-one operating system for pilates & yoga studios: booking, payments, memberships, staff, finance and marketing — designed to work as one. Free 7-day trial, no card.",
  openGraph: {
    title: "Studio Nexis — The operating system for pilates & yoga studios",
    description: "Booking, payments, memberships, staff, finance and marketing in one beautiful platform.",
    type: "website",
  },
};

export default async function Home() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
  if (!MARKETING_HOSTS.includes(host)) redirect("/dashboard");
  return <Landing />;
}
