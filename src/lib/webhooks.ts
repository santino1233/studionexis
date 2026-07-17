import { createHmac } from "crypto";
import { db } from "@/lib/db";

// Outgoing webhooks + chat notifications (Wave 15 A2/A3).
// Fire-and-forget: never blocks or fails the caller.

export type Webhook = { url: string; secret: string; events: string[] };
export type AppsConfig = {
  slackUrl?: string;
  discordUrl?: string;
  telegramToken?: string;
  telegramChatId?: string;
  icalToken?: string;
  chatDisabled?: boolean;
  pixels?: { ga4?: string; meta?: string; tiktok?: string };
  installed?: string[]; // App Store: ids the studio has explicitly added
};

export const WEBHOOK_EVENTS = ["booking.created", "booking.cancelled", "client.created", "order.paid"] as const;

export function webhooksOf(policies: unknown): Webhook[] {
  const v = ((policies ?? {}) as { webhooks?: Webhook[] }).webhooks;
  return Array.isArray(v) ? v : [];
}

export function appsOf(policies: unknown): AppsConfig {
  return ((policies ?? {}) as { apps?: AppsConfig }).apps ?? {};
}

async function post(url: string, body: string, headers: Record<string, string>) {
  await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) }).catch(() => {});
}

// Human line for chat apps.
function chatLine(event: string, data: Record<string, unknown>): string {
  switch (event) {
    case "booking.created":
      return `📅 New booking: ${data.clientName} → ${data.className} (${data.startsAt}) · ${data.seats} seat(s)`;
    case "booking.cancelled":
      return `❌ Cancelled: ${data.clientName} → ${data.className}`;
    case "client.created":
      return `👋 New client: ${data.name}`;
    case "order.paid":
      return `💰 Sale: ${data.total} ${data.currency} · ${data.label}`;
    case "chat.message":
      return `💬 Live chat from ${data.clientName}: "${data.text}"`;
    default:
      return `${event}`;
  }
}

export function emitEvent(tenantId: string, event: string, data: Record<string, unknown>) {
  // Detached async — caller never waits.
  void (async () => {
    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { policies: true, name: true } });
      if (!tenant) return;
      const payload = JSON.stringify({ event, studio: tenant.name, data, at: new Date().toISOString() });

      for (const hook of webhooksOf(tenant.policies)) {
        if (!hook.events.includes(event) || !hook.url?.startsWith("http")) continue;
        const sig = createHmac("sha256", hook.secret).update(payload).digest("hex");
        await post(hook.url, payload, { "Content-Type": "application/json", "X-Nexis-Event": event, "X-Nexis-Signature": sig });
      }

      const apps = appsOf(tenant.policies);
      const line = chatLine(event, data);
      if (apps.slackUrl?.startsWith("http")) await post(apps.slackUrl, JSON.stringify({ text: line }), { "Content-Type": "application/json" });
      if (apps.discordUrl?.startsWith("http")) await post(apps.discordUrl, JSON.stringify({ content: line }), { "Content-Type": "application/json" });
      if (apps.telegramToken && apps.telegramChatId) {
        await post(`https://api.telegram.org/bot${apps.telegramToken}/sendMessage`, JSON.stringify({ chat_id: apps.telegramChatId, text: line }), { "Content-Type": "application/json" });
      }
    } catch {}
  })();
}
