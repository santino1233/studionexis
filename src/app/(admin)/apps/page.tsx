import { Card, CardHeader } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";
import { WEBHOOK_EVENTS, webhooksOf, appsOf } from "@/lib/webhooks";
import { studioStripeConfig } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const save = "rounded-[10px] bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-ink";

function Chip({ on, yes = "Connected", no = "Not connected" }: { on: boolean; yes?: string; no?: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${on ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{on ? yes : no}</span>;
}

// The App Store (Wave 15 A3) — Pipedrive-style integrations grid.
export default async function AppsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const tenant = await getCurrentTenant();
  const apps = appsOf(tenant.policies);
  const hooks = webhooksOf(tenant.policies);
  const stripeOn = !!studioStripeConfig(tenant).secretKey;
  const twilioOn = !!process.env.TWILIO_ACCOUNT_SID;
  const icalUrl = apps.icalToken ? `https://app.nexis.revsports.ca/api/public/ical/${tenant.slug}?token=${apps.icalToken}` : null;

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">App Store</h1>
      <p className="mt-1 text-sm text-muted">Connect the tools your studio already uses. Everything here works with your data in real time.</p>
      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Saved.</div>}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Automation */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Automation" title="Make.com & Zapier" sub="Send bookings, clients and sales anywhere" />
            <Chip on={hooks.length > 0} yes={`${hooks.length} webhook${hooks.length === 1 ? "" : "s"}`} no="No webhooks" />
          </div>
          <div className="space-y-3 p-5 pt-0">
            {hooks.map((h, i) => (
              <div key={i} className="rounded-xl border border-line-2 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate font-mono text-[11.5px] text-ink">{h.url}</code>
                  <form method="post" action="/api/settings"><input type="hidden" name="section" value="webhook-remove" /><input type="hidden" name="idx" value={i} /><input type="hidden" name="next" value="/apps?saved=1" /><button className="rounded-lg bg-line-2 px-2 py-1 text-[11px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">✕</button></form>
                </div>
                <div className="mt-1 text-[11px] text-muted">{h.events.join(" · ")} · secret: <code className="font-mono">{h.secret.slice(0, 12)}…</code></div>
              </div>
            ))}
            <form method="post" action="/api/settings" className="space-y-2.5 border-t border-line-2 pt-3">
              <input type="hidden" name="section" value="webhook-add" />
              <input type="hidden" name="next" value="/apps?saved=1" />
              <input name="url" required placeholder="https:// webhook URL (from Make or Zapier)" className={field} />
              <div className="flex flex-wrap gap-3">
                {WEBHOOK_EVENTS.map((e) => (
                  <label key={e} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
                    <input type="checkbox" name="events" value={e} defaultChecked className="size-3.5 accent-[#F97316]" /> {e}
                  </label>
                ))}
              </div>
              <button className={save}>Add webhook</button>
              <p className="text-[11.5px] text-muted">We POST signed JSON the moment events happen. Full payloads in the <a href="/developers#automation" target="_blank" className="font-bold text-brand hover:underline">API docs</a>.</p>
            </form>
          </div>
        </Card>

        {/* Chat alerts */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Alerts" title="Slack · Discord · Telegram" sub="Booking & sale alerts in your team chat" />
            <Chip on={!!(apps.slackUrl || apps.discordUrl || apps.telegramToken)} />
          </div>
          <div className="space-y-3 p-5 pt-0">
            <form method="post" action="/api/settings" className="flex gap-2">
              <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
              <input name="slackUrl" defaultValue={apps.slackUrl ?? ""} placeholder="Slack incoming-webhook URL" className={field} />
              <button className={save}>Save</button>
            </form>
            <form method="post" action="/api/settings" className="flex gap-2">
              <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
              <input name="discordUrl" defaultValue={apps.discordUrl ?? ""} placeholder="Discord webhook URL" className={field} />
              <button className={save}>Save</button>
            </form>
            <form method="post" action="/api/settings" className="flex gap-2">
              <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
              <input name="telegramToken" defaultValue={apps.telegramToken ?? ""} placeholder="Telegram bot token" className={field} />
              <input name="telegramChatId" defaultValue={apps.telegramChatId ?? ""} placeholder="Chat ID" className={`${field} w-[120px]`} />
              <button className={save}>Save</button>
            </form>
          </div>
        </Card>

        {/* Calendar feed */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Calendar" title="Google / Apple / Outlook" sub="Subscribe to your class schedule from any calendar" />
            <Chip on={!!apps.icalToken} yes="Feed active" no="Off" />
          </div>
          <div className="space-y-3 p-5 pt-0">
            {icalUrl && <code className="block break-all rounded-xl bg-raised p-3 font-mono text-[11.5px] text-ink">{icalUrl}</code>}
            <form method="post" action="/api/settings">
              <input type="hidden" name="section" value="apps" /><input type="hidden" name="regenIcal" value="1" /><input type="hidden" name="next" value="/apps?saved=1" />
              <button className={save}>{apps.icalToken ? "Regenerate feed URL" : "Create calendar feed"}</button>
            </form>
            <p className="text-[11.5px] text-muted">Paste the URL into &ldquo;Add calendar → From URL&rdquo; — your public classes appear and stay in sync.</p>
          </div>
        </Card>

        {/* Ad pixels */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Marketing" title="Ad pixels & analytics" sub="GA4, Meta and TikTok on your booking site" />
            <Chip on={!!(apps.pixels?.ga4 || apps.pixels?.meta || apps.pixels?.tiktok)} />
          </div>
          <form method="post" action="/api/settings" className="space-y-2.5 p-5 pt-0">
            <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
            <input name="ga4" defaultValue={apps.pixels?.ga4 ?? ""} placeholder="Google Analytics 4 ID (G-XXXXXXX)" className={field} />
            <input name="meta" defaultValue={apps.pixels?.meta ?? ""} placeholder="Meta Pixel ID" className={field} />
            <input name="tiktok" defaultValue={apps.pixels?.tiktok ?? ""} placeholder="TikTok Pixel ID" className={field} />
            <button className={save}>Save pixels</button>
            <p className="text-[11.5px] text-muted">Injected on your public website and booking pages — retarget visitors and measure ad conversions.</p>
          </form>
        </Card>

        {/* Live chat */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Support" title="Live chat widget" sub="Tidio-style chat bubble on your website & booking pages" />
            <Chip on={!apps.chatDisabled} yes="On" no="Off" />
          </div>
          <div className="space-y-2.5 p-5 pt-0">
            <p className="text-[13px] text-muted">Visitors message you from the 💬 bubble; you reply from <a href="/inbox" className="font-bold text-brand hover:underline">Inbox</a>. Pipe alerts to Slack/Telegram above.</p>
            <form method="post" action="/api/settings">
              <input type="hidden" name="section" value="apps" />
              <input type="hidden" name="chatToggle" value={apps.chatDisabled ? "on" : "off"} />
              <input type="hidden" name="next" value="/apps?saved=1" />
              <button className={save}>{apps.chatDisabled ? "Turn chat on" : "Turn chat off"}</button>
            </form>
          </div>
        </Card>

        {/* Payments + SMS status cards */}
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Payments" title="Stripe" sub="Card payments for packages, memberships and classes" />
            <Chip on={stripeOn} />
          </div>
          <p className="p-5 pt-0 text-[13px] text-muted">Connect in <a href="/settings?tab=money" className="font-bold text-brand hover:underline">Settings → Money</a> — the &ldquo;Pay online&rdquo; options appear instantly.</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between pr-5">
            <CardHeader eyebrow="Messaging" title="SMS & WhatsApp (Twilio)" sub="Confirmations & reminders by text" />
            <Chip on={twilioOn} yes="Active" no="Awaiting platform setup" />
          </div>
          <p className="p-5 pt-0 text-[13px] text-muted">Included on Growth &amp; Scale plans — buy credits in <a href="/billing" className="font-bold text-brand hover:underline">Plan &amp; Billing</a>. WhatsApp rides the same connection once live.</p>
        </Card>
      </div>
    </div>
  );
}
