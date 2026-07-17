// Inline SVG brand logos for the App Store — self-contained (no external
// requests), so they render anywhere including under the strict CSP. Simplified
// but brand-accurate marks and colours, one per catalog app id.

export function AppLogo({ id, className = "" }: { id: string; className?: string }) {
  const svg = LOGOS[id] ?? LOGOS.default;
  return <span className={className} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
}

const wrap = (inner: string) => `<svg viewBox="0 0 32 32" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const LOGOS: Record<string, string> = {
  // Zapier — orange 6-spoke asterisk
  automation: wrap(`<rect width="32" height="32" rx="8" fill="#FF4A00"/><g stroke="#fff" stroke-width="2.6" stroke-linecap="round"><line x1="16" y1="7" x2="16" y2="25"/><line x1="8.2" y1="11.5" x2="23.8" y2="20.5"/><line x1="8.2" y1="20.5" x2="23.8" y2="11.5"/></g>`),
  // Slack — 4-colour pinwheel
  slack: wrap(`<rect x="13" y="3" width="6" height="13" rx="3" fill="#36C5F0"/><rect x="16" y="13" width="13" height="6" rx="3" fill="#ECB22E"/><rect x="13" y="16" width="6" height="13" rx="3" fill="#2EB67D"/><rect x="3" y="13" width="13" height="6" rx="3" fill="#E01E5A"/>`),
  // Discord — blurple badge with white face
  discord: wrap(`<rect width="32" height="32" rx="8" fill="#5865F2"/><path d="M22.6 10.6a14.5 14.5 0 0 0-3.6-1.1l-.2.4c1.4.3 2.3.8 3.1 1.4a12 12 0 0 0-9.8 0c.8-.6 1.8-1.1 3.1-1.4l-.2-.4a14.5 14.5 0 0 0-3.6 1.1C8.2 13.2 7.7 16 7.9 18.8a14.7 14.7 0 0 0 4.4 2.2l.9-1.4c-.8-.3-1.5-.7-2-1.1l.4-.3a10.6 10.6 0 0 0 8.9 0l.4.3c-.6.4-1.3.8-2 1.1l.9 1.4a14.6 14.6 0 0 0 4.4-2.2c.3-3.3-.5-6-2.5-8.2z" fill="#fff"/><circle cx="13" cy="16.2" r="1.4" fill="#5865F2"/><circle cx="19" cy="16.2" r="1.4" fill="#5865F2"/>`),
  // Telegram — blue disc with paper plane
  telegram: wrap(`<circle cx="16" cy="16" r="13" fill="#229ED9"/><path d="M23.4 9.6 8.9 15.2c-1 .4-1 1-.1 1.2l3.6 1.1 1.4 4.3c.2.5.3.7.7.7.4 0 .5-.2.8-.4l1.9-1.8 3.8 2.8c.7.4 1.2.2 1.4-.7l2.5-11.7c.2-1.1-.4-1.6-1.5-1.1z" fill="#fff"/><path d="m12.7 17.5 8-5c.4-.2.7 0 .4.3l-6.6 6-.2 2.6z" fill="#C8DAEA"/>`),
  // Google Calendar — white card, blue 31
  calendar: wrap(`<rect x="4" y="4" width="24" height="24" rx="4" fill="#fff" stroke="#DADCE0" stroke-width="1.5"/><rect x="4" y="4" width="24" height="6" rx="4" fill="#4285F4"/><rect x="4" y="8" width="24" height="2" fill="#4285F4"/><text x="16" y="24" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#4285F4" text-anchor="middle">31</text>`),
  // Google Analytics — amber bars
  ga4: wrap(`<rect width="32" height="32" rx="8" fill="#fff"/><rect x="19" y="6" width="6.5" height="20" rx="3.25" fill="#F9AB00"/><rect x="6.5" y="15" width="6.5" height="11" rx="3.25" fill="#E37400"/><circle cx="9.75" cy="22.5" r="3.25" fill="#E37400"/>`),
  // Meta — blue infinity
  meta: wrap(`<rect width="32" height="32" rx="8" fill="#fff"/><path d="M6 20c0-5 2.6-8 5.6-8 2.4 0 3.8 1.9 4.4 3.2.6-1.3 2-3.2 4.4-3.2 3 0 5.6 3 5.6 8 0 2.6-1.4 4-3.2 4-2.6 0-4-3.4-6.8-8-2.8 4.6-4.2 8-6.8 8C7.4 24 6 22.6 6 20z" fill="none" stroke="#0866FF" stroke-width="2.6" stroke-linecap="round"/>`),
  // TikTok — black badge with offset music note
  tiktok: wrap(`<rect width="32" height="32" rx="8" fill="#010101"/><path d="M18.4 8.2c.4 2 1.7 3.5 3.7 3.8v2.4c-1.1 0-2.3-.4-3.2-1v5.1c0 2.6-2.1 4.7-4.7 4.7s-4.7-2.1-4.7-4.7 2.1-4.7 4.7-4.7c.3 0 .5 0 .8.1v2.5c-.3-.1-.5-.1-.8-.1-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V8.2z" fill="#25F4EE"/><path d="M19.4 8.2c.4 2 1.7 3.5 3.7 3.8v2.4c-1.1 0-2.3-.4-3.2-1v5.1c0 2.6-2.1 4.7-4.7 4.7-.6 0-1.2-.1-1.7-.3 1.6-.6 2.7-2.1 2.7-3.9V7.4h2.4c0 .2.1.5.1.8z" fill="#FE2C55"/><path d="M18.9 7.4c.4 2 1.7 3.5 3.7 3.8v2.4c-1.1 0-2.3-.4-3.2-1v5.1c0 2.6-2.1 4.7-4.7 4.7s-4.7-2.1-4.7-4.7 2.1-4.7 4.7-4.7c.3 0 .5 0 .8.1v2.5c-.3-.1-.5-.1-.8-.1-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V7.4z" fill="#fff"/>`),
  // Live chat — our product, brand speech bubble
  livechat: wrap(`<rect width="32" height="32" rx="8" fill="#F97316"/><path d="M8 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4h-0a2 2 0 0 1-2-2z" fill="#fff"/><g fill="#F97316"><circle cx="13" cy="14" r="1.4"/><circle cx="16" cy="14" r="1.4"/><circle cx="19" cy="14" r="1.4"/></g>`),
  // Stripe — indigo rounded square, white S
  stripe: wrap(`<rect width="32" height="32" rx="8" fill="#635BFF"/><path d="M15.7 12.4c0-.8.7-1.1 1.7-1.1 1.5 0 3.4.5 4.9 1.3V8.2c-1.6-.6-3.2-.9-4.9-.9-4 0-6.7 2.1-6.7 5.6 0 5.5 7.5 4.6 7.5 7 0 .9-.8 1.2-1.9 1.2-1.6 0-3.8-.7-5.5-1.6v4.5c1.9.8 3.8 1.2 5.5 1.2 4.1 0 6.9-2 6.9-5.6 0-5.9-7.5-4.8-7.5-7.2z" fill="#fff"/>`),
  // Twilio — red rounded square, message dots
  twilio: wrap(`<rect width="32" height="32" rx="8" fill="#F22F46"/><circle cx="16" cy="16" r="8.5" fill="#fff"/><g fill="#F22F46"><circle cx="12.8" cy="12.8" r="2.1"/><circle cx="19.2" cy="12.8" r="2.1"/><circle cx="12.8" cy="19.2" r="2.1"/><circle cx="19.2" cy="19.2" r="2.1"/></g>`),
  default: wrap(`<rect width="32" height="32" rx="8" fill="#E5E7EB"/><circle cx="16" cy="16" r="5" fill="#9CA3AF"/>`),
};
