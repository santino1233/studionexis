import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Landing from "@/components/site/landing";
import { baseForHost } from "@/lib/config";

// The apex host of any of our base domains (e.g. studionexis.com / www, and
// studionexis.com once added) serves the public marketing site. The admin app
// lives on app.<base> — hitting "/" there means a signed-in user, so send them
// to their dashboard. Middleware already gates access.

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
  const base = baseForHost(host);
  const isApex = base !== null && (host === base || host === `www.${base}`);
  if (!isApex) redirect("/dashboard");
  return <Landing />;
}
