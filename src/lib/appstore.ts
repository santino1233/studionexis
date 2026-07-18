import type { AppsConfig, Webhook } from "@/lib/webhooks";

// The App Store catalog. Apps are browsed and explicitly "added" to a studio;
// only added apps show their configuration, so the page stays tidy instead of
// dumping every integration side by side.
export type AppDef = {
  id: string;
  name: string;
  category: string;
  icon: string;
  blurb: string;
  kind: "config" | "status"; // status = external connection (Stripe/Twilio), not self-installable
};

export const APP_CATALOG: AppDef[] = [
  { id: "zapier", name: "Zapier", category: "Automation", icon: "⚡", blurb: "Push bookings, clients and sales to 7,000+ apps with a Zapier Catch Hook.", kind: "config" },
  { id: "make", name: "Make", category: "Automation", icon: "🔧", blurb: "Send bookings, clients and sales into Make.com scenarios via a webhook.", kind: "config" },
  { id: "slack", name: "Slack", category: "Team alerts", icon: "💬", blurb: "Post booking & sale alerts to a Slack channel the moment they happen.", kind: "config" },
  { id: "discord", name: "Discord", category: "Team alerts", icon: "🎮", blurb: "Send booking & sale alerts to your Discord server.", kind: "config" },
  { id: "telegram", name: "Telegram", category: "Team alerts", icon: "✈️", blurb: "Get booking & sale alerts in a Telegram chat via your bot.", kind: "config" },
  { id: "googlechat", name: "Google Chat", category: "Team alerts", icon: "💬", blurb: "Send booking & sale alerts to a Google Chat space via a webhook.", kind: "config" },
  { id: "teams", name: "Microsoft Teams", category: "Team alerts", icon: "💠", blurb: "Post booking & sale alerts to a Microsoft Teams channel.", kind: "config" },
  { id: "calendar", name: "Calendar feed", category: "Calendar", icon: "📅", blurb: "Subscribe to your class schedule from Google, Apple or Outlook.", kind: "config" },
  { id: "ga4", name: "Google Analytics", category: "Marketing", icon: "📊", blurb: "Add your GA4 tag to your booking site to measure traffic and conversions.", kind: "config" },
  { id: "gtm", name: "Google Tag Manager", category: "Marketing", icon: "🏷️", blurb: "Manage all your marketing tags from one GTM container on your site.", kind: "config" },
  { id: "meta", name: "Meta Pixel", category: "Marketing", icon: "🎯", blurb: "Add the Meta (Facebook/Instagram) Pixel to retarget visitors with ads.", kind: "config" },
  { id: "tiktok", name: "TikTok Pixel", category: "Marketing", icon: "🎵", blurb: "Add the TikTok Pixel to track and retarget from your TikTok campaigns.", kind: "config" },
  { id: "pinterest", name: "Pinterest Tag", category: "Marketing", icon: "📌", blurb: "Track conversions and retarget from your Pinterest campaigns.", kind: "config" },
  { id: "snapchat", name: "Snapchat Pixel", category: "Marketing", icon: "👻", blurb: "Measure and retarget visitors from your Snapchat ads.", kind: "config" },
  { id: "clarity", name: "Microsoft Clarity", category: "Insights", icon: "🔥", blurb: "Free heatmaps & session recordings to see how visitors use your site.", kind: "config" },
  { id: "zalo", name: "Zalo", category: "Support", icon: "💙", blurb: "Add a “Chat on Zalo” button to your booking site so clients reach you on Zalo.", kind: "config" },
  { id: "livechat", name: "Live chat widget", category: "Support", icon: "💬", blurb: "A chat bubble on your website and booking pages, answered from your Inbox.", kind: "config" },
  { id: "stripe", name: "Stripe payments", category: "Payments", icon: "💳", blurb: "Take card payments for packages, memberships and classes.", kind: "status" },
  { id: "twilio", name: "SMS & WhatsApp", category: "Messaging", icon: "✉️", blurb: "Send confirmations and reminders by text and WhatsApp.", kind: "status" },
];

export const CONFIG_APP_IDS = APP_CATALOG.filter((a) => a.kind === "config").map((a) => a.id);

// Does this app already have real configuration? (so we never hide live setups)
export function appConfigured(id: string, apps: AppsConfig, hooks: Webhook[]): boolean {
  switch (id) {
    case "zapier": return hooks.some((h) => h.source !== "make");
    case "make": return hooks.some((h) => h.source === "make");
    case "slack": return !!apps.slackUrl;
    case "discord": return !!apps.discordUrl;
    case "googlechat": return !!apps.googleChatUrl;
    case "teams": return !!apps.teamsUrl;
    case "telegram": return !!apps.telegramToken;
    case "calendar": return !!apps.icalToken;
    case "ga4": return !!apps.pixels?.ga4;
    case "gtm": return !!apps.pixels?.gtm;
    case "meta": return !!apps.pixels?.meta;
    case "tiktok": return !!apps.pixels?.tiktok;
    case "pinterest": return !!apps.pixels?.pinterest;
    case "snapchat": return !!apps.pixels?.snapchat;
    case "clarity": return !!apps.pixels?.clarity;
    case "zalo": return !!apps.zaloId;
    case "livechat": return !apps.chatDisabled; // on by default
    default: return false;
  }
}

// An app is "in Your apps" if the studio added it OR it already has config.
export function appInstalled(id: string, apps: AppsConfig, hooks: Webhook[]): boolean {
  return (apps.installed ?? []).includes(id) || appConfigured(id, apps, hooks);
}
