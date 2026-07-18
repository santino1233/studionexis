import { Card } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";
import { WEBHOOK_EVENTS, webhooksOf, appsOf } from "@/lib/webhooks";
import { studioStripeConfig } from "@/lib/stripe";
import { APP_CATALOG, appInstalled, type AppDef } from "@/lib/appstore";
import { AppLogo } from "@/components/apps/app-logos";
import { StoreBrowser } from "@/components/apps/store-browser";

export const dynamic = "force-dynamic";

const field = "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const save = "rounded-[10px] bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-ink";

function Chip({ on, yes = "Connected", no = "Not connected" }: { on: boolean; yes?: string; no?: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${on ? "bg-green-wash text-green" : "bg-line-2 text-muted"}`}>{on ? yes : no}</span>;
}

function RemoveButton({ id }: { id: string }) {
  return (
    <form method="post" action="/api/settings">
      <input type="hidden" name="section" value="app-uninstall" />
      <input type="hidden" name="appId" value={id} />
      <input type="hidden" name="next" value="/apps?saved=1" />
      <button className="rounded-lg border border-line-2 px-2.5 py-1 text-[11px] font-bold text-muted hover:border-rose/40 hover:bg-rose/5 hover:text-rose">Remove</button>
    </form>
  );
}

function Panel({ app, chip, remove, children }: { app: AppDef; chip: React.ReactNode; remove?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-line-2 p-4">
        <span className="size-10 shrink-0"><AppLogo id={app.id} className="block size-10" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">{app.name}</div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{app.category}</div>
        </div>
        {chip}
        {remove && <RemoveButton id={app.id} />}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

// The App Store — Pipedrive-style: your added apps show their config; a
// searchable marketplace popup handles browsing, adding and requesting apps.
export default async function AppsPage({ searchParams }: { searchParams: Promise<{ saved?: string; requested?: string }> }) {
  const { saved, requested } = await searchParams;
  const tenant = await getCurrentTenant();
  const apps = appsOf(tenant.policies);
  const hooks = webhooksOf(tenant.policies);
  const stripeOn = !!studioStripeConfig(tenant).secretKey;
  const twilioOn = !!process.env.TWILIO_ACCOUNT_SID;
  const icalUrl = apps.icalToken ? `https://app.nexis.revsports.ca/api/public/ical/${tenant.slug}?token=${apps.icalToken}` : null;

  const isOn = (a: AppDef) => a.id === "stripe" ? stripeOn : a.id === "twilio" ? twilioOn : appInstalled(a.id, apps, hooks);
  const installed = APP_CATALOG.filter(isOn);
  const browse = APP_CATALOG.filter((a) => !isOn(a)).map(({ id, name, category, blurb, kind }) => ({ id, name, category, blurb, kind }));

  const byId = Object.fromEntries(APP_CATALOG.map((a) => [a.id, a]));

  // Zapier owns untagged (legacy) + zapier-tagged hooks; Make owns make-tagged.
  const hooksFor = (src: "zapier" | "make") => hooks.map((h, i) => ({ h, i })).filter(({ h }) => src === "make" ? h.source === "make" : h.source !== "make");
  const webhookPanel = (src: "zapier" | "make", placeholder: string) => {
    const mine = hooksFor(src);
    return (
      <div className="space-y-3">
        {mine.map(({ h, i }) => (
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
          <input type="hidden" name="source" value={src} />
          <input type="hidden" name="next" value="/apps?saved=1" />
          <input name="url" required placeholder={placeholder} className={field} />
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
    );
  };

  const panels: Record<string, React.ReactNode> = {
    zapier: (
      <Panel key="zapier" app={byId.zapier} remove chip={<Chip on={hooksFor("zapier").length > 0} yes={`${hooksFor("zapier").length} hook${hooksFor("zapier").length === 1 ? "" : "s"}`} no="No hooks" />}>
        {webhookPanel("zapier", "https:// Zapier Catch Hook URL")}
      </Panel>
    ),
    make: (
      <Panel key="make" app={byId.make} remove chip={<Chip on={hooksFor("make").length > 0} yes={`${hooksFor("make").length} hook${hooksFor("make").length === 1 ? "" : "s"}`} no="No hooks" />}>
        {webhookPanel("make", "https:// Make.com custom-webhook URL")}
      </Panel>
    ),
    zalo: (
      <Panel key="zalo" app={byId.zalo} remove chip={<Chip on={!!apps.zaloId} />}>
        <form method="post" action="/api/settings" className="space-y-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <div className="flex gap-2">
            <input name="zaloId" defaultValue={apps.zaloId ?? ""} placeholder="Zalo phone or OA id (e.g. 84901234567)" className={field} />
            <button className={save}>Save</button>
          </div>
          <p className="text-[11.5px] text-muted">Adds a &ldquo;Chat on Zalo&rdquo; button to your booking site linking to zalo.me/your-id.</p>
        </form>
      </Panel>
    ),
    slack: (
      <Panel key="slack" app={byId.slack} remove chip={<Chip on={!!apps.slackUrl} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="slackUrl" defaultValue={apps.slackUrl ?? ""} placeholder="Slack incoming-webhook URL" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    discord: (
      <Panel key="discord" app={byId.discord} remove chip={<Chip on={!!apps.discordUrl} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="discordUrl" defaultValue={apps.discordUrl ?? ""} placeholder="Discord webhook URL" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    telegram: (
      <Panel key="telegram" app={byId.telegram} remove chip={<Chip on={!!apps.telegramToken} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="telegramToken" defaultValue={apps.telegramToken ?? ""} placeholder="Telegram bot token" className={field} />
          <input name="telegramChatId" defaultValue={apps.telegramChatId ?? ""} placeholder="Chat ID" className={`${field} w-[120px]`} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    googlechat: (
      <Panel key="googlechat" app={byId.googlechat} remove chip={<Chip on={!!apps.googleChatUrl} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="googleChatUrl" defaultValue={apps.googleChatUrl ?? ""} placeholder="Google Chat webhook URL" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    teams: (
      <Panel key="teams" app={byId.teams} remove chip={<Chip on={!!apps.teamsUrl} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="teamsUrl" defaultValue={apps.teamsUrl ?? ""} placeholder="Microsoft Teams incoming-webhook URL" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    calendar: (
      <Panel key="calendar" app={byId.calendar} remove chip={<Chip on={!!apps.icalToken} yes="Feed active" no="Off" />}>
        <div className="space-y-3">
          {icalUrl && <code className="block break-all rounded-xl bg-raised p-3 font-mono text-[11.5px] text-ink">{icalUrl}</code>}
          <form method="post" action="/api/settings">
            <input type="hidden" name="section" value="apps" /><input type="hidden" name="regenIcal" value="1" /><input type="hidden" name="next" value="/apps?saved=1" />
            <button className={save}>{apps.icalToken ? "Regenerate feed URL" : "Create calendar feed"}</button>
          </form>
          <p className="text-[11.5px] text-muted">Paste the URL into &ldquo;Add calendar → From URL&rdquo; — your public classes appear and stay in sync.</p>
        </div>
      </Panel>
    ),
    ga4: (
      <Panel key="ga4" app={byId.ga4} remove chip={<Chip on={!!apps.pixels?.ga4} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="ga4" defaultValue={apps.pixels?.ga4 ?? ""} placeholder="Measurement ID (G-XXXXXXX)" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    meta: (
      <Panel key="meta" app={byId.meta} remove chip={<Chip on={!!apps.pixels?.meta} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="meta" defaultValue={apps.pixels?.meta ?? ""} placeholder="Meta Pixel ID" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    tiktok: (
      <Panel key="tiktok" app={byId.tiktok} remove chip={<Chip on={!!apps.pixels?.tiktok} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="tiktok" defaultValue={apps.pixels?.tiktok ?? ""} placeholder="TikTok Pixel ID" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    gtm: (
      <Panel key="gtm" app={byId.gtm} remove chip={<Chip on={!!apps.pixels?.gtm} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="gtm" defaultValue={apps.pixels?.gtm ?? ""} placeholder="Container ID (GTM-XXXXXX)" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    pinterest: (
      <Panel key="pinterest" app={byId.pinterest} remove chip={<Chip on={!!apps.pixels?.pinterest} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="pinterest" defaultValue={apps.pixels?.pinterest ?? ""} placeholder="Pinterest Tag ID" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    snapchat: (
      <Panel key="snapchat" app={byId.snapchat} remove chip={<Chip on={!!apps.pixels?.snapchat} />}>
        <form method="post" action="/api/settings" className="flex gap-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <input name="snapchat" defaultValue={apps.pixels?.snapchat ?? ""} placeholder="Snap Pixel ID" className={field} />
          <button className={save}>Save</button>
        </form>
      </Panel>
    ),
    clarity: (
      <Panel key="clarity" app={byId.clarity} remove chip={<Chip on={!!apps.pixels?.clarity} />}>
        <form method="post" action="/api/settings" className="space-y-2">
          <input type="hidden" name="section" value="apps" /><input type="hidden" name="next" value="/apps?saved=1" />
          <div className="flex gap-2">
            <input name="clarity" defaultValue={apps.pixels?.clarity ?? ""} placeholder="Clarity Project ID" className={field} />
            <button className={save}>Save</button>
          </div>
          <p className="text-[11.5px] text-muted">Free from Microsoft — heatmaps and session recordings of your booking site.</p>
        </form>
      </Panel>
    ),
    livechat: (
      <Panel key="livechat" app={byId.livechat} remove chip={<Chip on={!apps.chatDisabled} yes="On" no="Off" />}>
        <div className="space-y-2.5">
          <p className="text-[13px] text-muted">Visitors message you from the 💬 bubble; you reply from <a href="/inbox" className="font-bold text-brand hover:underline">Inbox</a>. Pipe alerts to Slack/Telegram too.</p>
          <form method="post" action="/api/settings">
            <input type="hidden" name="section" value="apps" />
            <input type="hidden" name="chatToggle" value={apps.chatDisabled ? "on" : "off"} />
            <input type="hidden" name="next" value="/apps?saved=1" />
            <button className={save}>{apps.chatDisabled ? "Turn chat on" : "Turn chat off"}</button>
          </form>
        </div>
      </Panel>
    ),
    stripe: (
      <Panel key="stripe" app={byId.stripe} chip={<Chip on={stripeOn} />}>
        <p className="text-[13px] text-muted">Manage in <a href="/settings?tab=money" className="font-bold text-brand hover:underline">Settings → Money</a>. The &ldquo;Pay online&rdquo; options appear instantly.</p>
      </Panel>
    ),
    twilio: (
      <Panel key="twilio" app={byId.twilio} chip={<Chip on={twilioOn} yes="Active" no="Awaiting platform setup" />}>
        <p className="text-[13px] text-muted">Included on Growth &amp; Scale plans — buy credits in <a href="/billing" className="font-bold text-brand hover:underline">Plan &amp; Billing</a>. WhatsApp rides the same connection once live.</p>
      </Panel>
    ),
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">App Store</h1>
          <p className="mt-1 text-sm text-muted">{APP_CATALOG.length} integrations and counting — add the tools your studio needs, nothing you don&apos;t.</p>
        </div>
        <StoreBrowser browse={browse} />
      </div>
      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Saved.</div>}
      {requested === "1" && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Thanks — your app request went to our team. We&apos;ll look into adding it.</div>}

      <div className="mt-7 flex items-center gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">Your apps</h2>
        <span className="rounded-full bg-line-2 px-2 py-0.5 text-[11px] font-bold text-muted">{installed.length}</span>
      </div>
      {installed.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line-2 bg-raised/40 p-8 text-center text-[13px] text-muted">
          No apps added yet. Open the marketplace to add your first one.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {installed.map((a) => panels[a.id])}
        </div>
      )}
    </div>
  );
}
