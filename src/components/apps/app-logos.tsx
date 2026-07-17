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
  alerts: wrap(`<rect x="13" y="3" width="6" height="13" rx="3" fill="#36C5F0"/><rect x="16" y="13" width="13" height="6" rx="3" fill="#ECB22E"/><rect x="13" y="16" width="6" height="13" rx="3" fill="#2EB67D"/><rect x="3" y="13" width="13" height="6" rx="3" fill="#E01E5A"/>`),
  // Google Calendar — white card, blue 31
  calendar: wrap(`<rect x="4" y="4" width="24" height="24" rx="4" fill="#fff" stroke="#DADCE0" stroke-width="1.5"/><rect x="4" y="4" width="24" height="6" rx="4" fill="#4285F4"/><rect x="4" y="8" width="24" height="2" fill="#4285F4"/><text x="16" y="24" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#4285F4" text-anchor="middle">31</text>`),
  // Meta — blue infinity
  pixels: wrap(`<rect width="32" height="32" rx="8" fill="#fff"/><path d="M6 20c0-5 2.6-8 5.6-8 2.4 0 3.8 1.9 4.4 3.2.6-1.3 2-3.2 4.4-3.2 3 0 5.6 3 5.6 8 0 2.6-1.4 4-3.2 4-2.6 0-4-3.4-6.8-8-2.8 4.6-4.2 8-6.8 8C7.4 24 6 22.6 6 20z" fill="none" stroke="#0866FF" stroke-width="2.6" stroke-linecap="round"/>`),
  // Live chat — our product, brand speech bubble
  livechat: wrap(`<rect width="32" height="32" rx="8" fill="#F97316"/><path d="M8 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4h-0a2 2 0 0 1-2-2z" fill="#fff"/><g fill="#F97316"><circle cx="13" cy="14" r="1.4"/><circle cx="16" cy="14" r="1.4"/><circle cx="19" cy="14" r="1.4"/></g>`),
  // Stripe — indigo rounded square, white S
  stripe: wrap(`<rect width="32" height="32" rx="8" fill="#635BFF"/><path d="M15.7 12.4c0-.8.7-1.1 1.7-1.1 1.5 0 3.4.5 4.9 1.3V8.2c-1.6-.6-3.2-.9-4.9-.9-4 0-6.7 2.1-6.7 5.6 0 5.5 7.5 4.6 7.5 7 0 .9-.8 1.2-1.9 1.2-1.6 0-3.8-.7-5.5-1.6v4.5c1.9.8 3.8 1.2 5.5 1.2 4.1 0 6.9-2 6.9-5.6 0-5.9-7.5-4.8-7.5-7.2z" fill="#fff"/>`),
  // Twilio — red rounded square, message dots
  twilio: wrap(`<rect width="32" height="32" rx="8" fill="#F22F46"/><circle cx="16" cy="16" r="8.5" fill="#fff"/><g fill="#F22F46"><circle cx="12.8" cy="12.8" r="2.1"/><circle cx="19.2" cy="12.8" r="2.1"/><circle cx="12.8" cy="19.2" r="2.1"/><circle cx="19.2" cy="19.2" r="2.1"/></g>`),
  default: wrap(`<rect width="32" height="32" rx="8" fill="#E5E7EB"/><circle cx="16" cy="16" r="5" fill="#9CA3AF"/>`),
};
