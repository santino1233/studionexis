import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { verifyStripeKey, studioStripeConfig } from "@/lib/stripe";
import { verifyPayPalCreds } from "@/lib/paypal";
import { BASE_DOMAIN } from "@/lib/config";
import { randomBytes } from "crypto";
import { WEBHOOK_EVENTS, webhooksOf, appsOf } from "@/lib/webhooks";
import { WEEKDAY_KEYS, isTime, DEFAULT_DAY } from "@/lib/hours";
import { guardCap } from "@/lib/rbac-server";
import { isTemplateKey } from "@/lib/email-templates";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "THB", "VND", "IDR", "PHP", "MYR", "JPY", "KRW", "AED", "INR"];

export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_settings");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || ["STAFF", "INSTRUCTOR"].includes(auth.role)) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const section = String(form.get("section") ?? "identity");
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });

  if (section === "identity") {
    const name = String(form.get("name") ?? "").trim();
    const currency = String(form.get("currency") ?? tenant.currency);
    const timezone = String(form.get("timezone") ?? tenant.timezone);
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return NextResponse.redirect(externalUrl(req, "/settings?error=tz"), 303);
    }
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        name: name || tenant.name,
        currency: CURRENCIES.includes(currency) ? currency : tenant.currency,
        timezone,
        brandColor: /^#[0-9a-fA-F]{6}$/.test(String(form.get("brandColor"))) ? String(form.get("brandColor")) : tenant.brandColor,
      },
    });
  } else if (section === "domain") {
    const raw = String(form.get("customDomain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const prevPol = (tenant.policies ?? {}) as Record<string, unknown>;
    if (raw === "") {
      delete prevPol.domain;
      await db.tenant.update({ where: { id: tenant.id }, data: { customDomain: null, policies: prevPol as object } });
    } else {
      if (!/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw) || raw.endsWith(BASE_DOMAIN)) {
        return NextResponse.redirect(externalUrl(req, "/settings?error=domain"), 303);
      }
      const taken = await db.tenant.findFirst({ where: { customDomain: raw, id: { not: tenant.id } } });
      if (taken) return NextResponse.redirect(externalUrl(req, "/settings?error=domaintaken"), 303);
      await db.tenant.update({
        where: { id: tenant.id },
        data: { customDomain: raw, policies: { ...prevPol, domain: { status: "PENDING_DNS" } } as object },
      });
    }
  } else if (section === "categories") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const cats = String(form.get("expenseCategories") ?? "")
      .split(",").map((c) => c.trim()).filter(Boolean).slice(0, 20);
    await db.tenant.update({
      where: { id: tenant.id },
      data: { policies: { ...prev, expenseCategories: cats } },
    });
  } else if (section === "template") {
    const prev = (tenant.website ?? {}) as Record<string, unknown>;
    const template = String(form.get("template") ?? "");
    const swatch = String(form.get("accent") ?? "").trim();
    const custom = String(form.get("accentCustom") ?? "").trim();
    const accent = /^#[0-9a-fA-F]{6}$/.test(swatch) ? swatch : custom;
    const mapUrl = String(form.get("mapUrl") ?? "").trim();
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        website: { ...prev, template: ["boutique", "luxury", "minimal", "serene", "bold"].includes(template) ? template : (prev.template ?? "boutique"), mapUrl },
        ...(/^#[0-9a-fA-F]{6}$/.test(accent) ? { brandColor: accent } : {}),
      },
    });
  } else if (section === "website") {
    const prev = (tenant.website ?? {}) as Record<string, unknown>;
    const pick = (k: string) => String(form.get(k) ?? "").trim();
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        website: {
          ...prev,
          tagline: pick("tagline"),
          about: pick("about"),
          address: pick("address"),
          phoneNumber: pick("phoneNumber"),
          instagram: pick("instagram").replace(/^@/, ""),
          hours: pick("hours"),
        },
      },
    });
  } else if (section === "upsell") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        policies: {
          ...prev,
          upsell: {
            groupPackageId: String(form.get("groupPackageId") ?? "") || null,
            privatePackageId: String(form.get("privatePackageId") ?? "") || null,
            hideIfActive: form.get("hideIfActive") === "on",
          },
        },
      },
    });
  } else if (section === "unlock-domain") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const feats = (Array.isArray(prev.customFeatures) ? prev.customFeatures : []) as { id: string }[];
    if (!feats.some((f) => f.id === "custom-domain")) {
      feats.push({ id: "custom-domain", label: "Custom domain", price: 12, active: true } as never);
      await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, customFeatures: feats } } });
      const { audit } = await import("@/lib/hq");
      audit({ tenantId: tenant.id, actor: auth.name, role: auth.role, action: "addon-unlocked", detail: "custom-domain $12/mo" });
    }
    return NextResponse.redirect(externalUrl(req, "/settings?tab=domain&saved=1"), 303);
  } else if (section === "webhook-add") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const url = String(form.get("url") ?? "").trim();
    const events = WEBHOOK_EVENTS.filter((e) => form.getAll("events").includes(e));
    const src = form.get("source"); const source = src === "make" ? "make" : src === "zapier" ? "zapier" : undefined;
    if (/^https:\/\//.test(url) && events.length > 0) {
      const hooks = webhooksOf(tenant.policies);
      if (hooks.length < 5) {
        hooks.push({ url, secret: `whsec_${randomBytes(16).toString("hex")}`, events, ...(source ? { source } : {}) });
        await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, webhooks: hooks } } });
      }
    }
  } else if (section === "webhook-remove") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const idx = Number(form.get("idx"));
    const hooks = webhooksOf(tenant.policies).filter((_, i) => i !== idx);
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, webhooks: hooks } } });
  } else if (section === "apps") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const apps = { ...appsOf(tenant.policies) };
    const set = (k: keyof typeof apps, v: string) => { (apps as Record<string, unknown>)[k] = v || undefined; };
    if (form.has("slackUrl")) set("slackUrl", String(form.get("slackUrl")).trim());
    if (form.has("discordUrl")) set("discordUrl", String(form.get("discordUrl")).trim());
    if (form.has("googleChatUrl")) set("googleChatUrl", String(form.get("googleChatUrl")).trim());
    if (form.has("teamsUrl")) set("teamsUrl", String(form.get("teamsUrl")).trim());
    if (form.has("zaloId")) set("zaloId", String(form.get("zaloId")).trim().replace(/[^A-Za-z0-9]/g, ""));
    if (form.has("telegramToken")) { set("telegramToken", String(form.get("telegramToken")).trim()); set("telegramChatId", String(form.get("telegramChatId")).trim()); }
    const PIXEL_KEYS = ["ga4", "meta", "tiktok", "clarity", "gtm", "pinterest", "snapchat"] as const;
    if (PIXEL_KEYS.some((k) => form.has(k))) {
      // Merge — each pixel is its own app, so only touch the fields present.
      const px = { ...(apps.pixels ?? {}) } as Record<string, string | undefined>;
      for (const k of PIXEL_KEYS) if (form.has(k)) px[k] = String(form.get(k)).trim() || undefined;
      apps.pixels = px;
    }
    if (String(form.get("regenIcal")) === "1") apps.icalToken = randomBytes(12).toString("hex");
    if (form.has("chatToggle")) apps.chatDisabled = String(form.get("chatToggle")) === "off" ? true : undefined;
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, apps } } });
  } else if (section === "security") {
    if (["STAFF", "INSTRUCTOR"].includes(auth.role)) return NextResponse.redirect(externalUrl(req, "/settings"), 303);
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const security = { ...((prev.security as Record<string, unknown>) ?? {}) };
    if (form.has("loginVerification")) {
      const v = String(form.get("loginVerification"));
      security.loginVerification = ["off", "email", "sms", "any"].includes(v) ? v : "any";
    }
    const templates = { ...((prev.emailTemplates as Record<string, unknown>) ?? {}) };
    if (form.has("tplSubject") || form.has("tplBody")) {
      templates.loginCode = {
        subject: String(form.get("tplSubject") ?? "").slice(0, 200),
        body: String(form.get("tplBody") ?? "").slice(0, 4000),
      };
    }
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, security, emailTemplates: templates } as Prisma.InputJsonValue } });
    return NextResponse.redirect(externalUrl(req, "/settings?tab=security&saved=1"), 303);
  } else if (section === "emailtpl") {
    // Per-template transactional email override (Settings → Email templates).
    // Stored on policies.emailTemplates.<key>; "reset" removes the override so
    // the built-in default takes over again. Validated against the template
    // registry so only known keys can ever be written.
    if (["STAFF", "INSTRUCTOR"].includes(auth.role)) return NextResponse.redirect(externalUrl(req, "/login"), 303);
    const key = String(form.get("key") ?? "");
    if (!isTemplateKey(key)) return NextResponse.redirect(externalUrl(req, "/settings?tab=emails"), 303);
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const templates = { ...((prev.emailTemplates as Record<string, unknown>) ?? {}) };
    if (String(form.get("action")) === "reset") {
      delete templates[key];
    } else {
      templates[key] = {
        subject: String(form.get("tplSubject") ?? "").slice(0, 200),
        body: String(form.get("tplBody") ?? "").slice(0, 4000),
      };
    }
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, emailTemplates: templates } as Prisma.InputJsonValue } });
  } else if (section === "org-sync") {
    if (auth.role !== "OWNER" || !tenant.organizationId) return NextResponse.redirect(externalUrl(req, "/locations"), 303);
    const org = await db.organization.findUnique({ where: { id: tenant.organizationId } });
    const prevPol = (org?.policies ?? {}) as Record<string, unknown>;
    const sync = {
      clients: form.get("clients") === "on",
      classTypes: form.get("classTypes") === "on",
      sharedCredits: form.get("sharedCredits") === "on",
      memberships: form.get("memberships") === "on",
    };
    await db.organization.update({ where: { id: tenant.organizationId }, data: { policies: { ...prevPol, sync } } });
    const { audit } = await import("@/lib/hq");
    audit({ tenantId: tenant.id, actor: auth.name, role: auth.role, action: "org-sync-updated", detail: JSON.stringify(sync) });
    return NextResponse.redirect(externalUrl(req, "/locations?saved=1"), 303);
  } else if (section === "app-install" || section === "app-uninstall") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const apps = { ...appsOf(tenant.policies) };
    const id = String(form.get("appId") ?? "").trim();
    const set = new Set(apps.installed ?? []);
    if (section === "app-install") {
      set.add(id);
    } else {
      set.delete(id);
      // Removing an app also clears its live configuration so it truly goes away.
      if (id === "slack") apps.slackUrl = undefined;
      if (id === "discord") apps.discordUrl = undefined;
      if (id === "googlechat") apps.googleChatUrl = undefined;
      if (id === "teams") apps.teamsUrl = undefined;
      if (id === "telegram") { apps.telegramToken = undefined; apps.telegramChatId = undefined; }
      if (id === "calendar") apps.icalToken = undefined;
      if (["ga4", "meta", "tiktok", "clarity", "gtm", "pinterest", "snapchat"].includes(id) && apps.pixels) apps.pixels = { ...apps.pixels, [id]: undefined };
      if (id === "livechat") apps.chatDisabled = true;
      if (id === "zalo") apps.zaloId = undefined;
      if (id === "zapier") prev.webhooks = webhooksOf(tenant.policies).filter((h) => h.source === "make");
      if (id === "make") prev.webhooks = webhooksOf(tenant.policies).filter((h) => h.source !== "make");
    }
    apps.installed = [...set];
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, apps } } });
  } else if (section === "apikey") {
    const act = String(form.get("action"));
    await db.tenant.update({
      where: { id: tenant.id },
      data: { apiKey: act === "revoke" ? null : `nx_live_${randomBytes(24).toString("hex")}` },
    });
  } else if (section === "stripe") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    if (String(form.get("action")) === "disconnect") {
      await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, stripe: {} } } });
    } else {
      const secretKey = String(form.get("secretKey") ?? "").trim();
      const check = secretKey.startsWith("sk_") ? await verifyStripeKey(secretKey) : { ok: false as const };
      if (!check.ok) return NextResponse.redirect(externalUrl(req, "/settings?tab=money&error=stripekey"), 303);
      await db.tenant.update({
        where: { id: tenant.id },
        data: { policies: { ...prev, stripe: { secretKey, accountLabel: check.label, connectedAt: new Date().toISOString() } } },
      });
    }
  } else if (section === "paypal") {
    // PayPal is a per-studio alternative to Stripe. Creds live in policies.paypal
    // and it only ever goes live once verified AND explicitly enabled. Never
    // invents credentials — a bad/empty key round-trips back with ?error=paypalkey.
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const prevPp = (prev.paypal ?? {}) as Record<string, unknown>;
    const action = String(form.get("action") ?? "");
    if (action === "disconnect") {
      await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, paypal: {} } } });
    } else if (action === "disable") {
      await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, paypal: { ...prevPp, enabled: false } } } });
    } else if (action === "enable") {
      if (prevPp.clientId && prevPp.secret) {
        await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, paypal: { ...prevPp, enabled: true } } } });
      } else {
        return NextResponse.redirect(externalUrl(req, "/settings?tab=money&error=paypalkey"), 303);
      }
    } else {
      const clientId = String(form.get("clientId") ?? "").trim();
      const secret = String(form.get("secret") ?? "").trim();
      const mode = String(form.get("mode") ?? "sandbox") === "live" ? "live" : "sandbox";
      const webhookId = String(form.get("webhookId") ?? "").trim();
      const check = clientId && secret ? await verifyPayPalCreds(clientId, secret, mode) : { ok: false as const };
      if (!check.ok) return NextResponse.redirect(externalUrl(req, "/settings?tab=money&error=paypalkey"), 303);
      await db.tenant.update({
        where: { id: tenant.id },
        data: { policies: { ...prev, paypal: { clientId, secret, mode, webhookId: webhookId || undefined, enabled: true, accountLabel: check.label, connectedAt: new Date().toISOString() } } },
      });
    }
  } else if (section === "classsetup") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const csv = (v: FormDataEntryValue | null) =>
      String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    await db.tenant.update({
      where: { id: tenant.id },
      data: { policies: { ...prev, classFormats: csv(form.get("classFormats")), difficultyLevels: csv(form.get("difficultyLevels")) } },
    });
  } else if (section === "policies") {
    // Merge into the JSON policies blob — never replace wholesale.
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        policies: {
          ...prev,
          cancelWindowGroupHours: Math.max(0, Number(form.get("cancelWindowGroupHours") ?? 3) || 0),
          cancelWindowPrivateHours: Math.max(0, Number(form.get("cancelWindowPrivateHours") ?? 3) || 0),
          waitlistEnabled: form.get("waitlistEnabled") === "on",
          // payAtStudio moved to Money → Payment collection (section "payment").
        },
      },
    });
  } else if (section === "hours") {
    // Structured weekly operating hours. Merge into the JSON policies blob so
    // nothing else is disturbed. Times are validated per field; a bad value
    // falls back to the sensible default rather than rejecting the whole save.
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const hours: Record<string, { open: string; close: string; closed: boolean }> = {};
    for (const k of WEEKDAY_KEYS) {
      const open = String(form.get(`${k}_open`) ?? "");
      const close = String(form.get(`${k}_close`) ?? "");
      hours[k] = {
        open: isTime(open) ? open : DEFAULT_DAY.open,
        close: isTime(close) ? close : DEFAULT_DAY.close,
        closed: form.get(`${k}_closed`) === "on",
      };
    }
    await db.tenant.update({ where: { id: tenant.id }, data: { policies: { ...prev, hours } } });
  } else if (section === "payment") {
    // Payment collection (Money tab). One mode is always selected. Deposit /
    // pay-in-full require an online payment method; if none is connected we fall
    // back to "at_studio" so a studio can't accidentally require a card it can't
    // charge. `payAtStudio` is kept in sync for the existing booking flow.
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const online = !!studioStripeConfig(tenant).secretKey;
    const raw = String(form.get("mode") ?? "at_studio");
    const mode = (raw === "deposit" || raw === "full") && online ? raw : "at_studio";
    const depositType = String(form.get("depositType") ?? "percent") === "fixed" ? "fixed" : "percent";
    const num = (k: string) => Math.max(0, Number(form.get(k) ?? 0) || 0);
    const payment = {
      mode,
      depositType,
      depositValue: num("depositValue"),
      depositFee: num("depositFee"),
      fullFee: num("fullFee"),
    };
    await db.tenant.update({
      where: { id: tenant.id },
      data: { policies: { ...prev, payment, payAtStudio: mode === "at_studio" } },
    });
  }
  const nextRaw = String(form.get("next") ?? "");
  if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    return NextResponse.redirect(externalUrl(req, nextRaw), 303);
  }
  let tab = "";
  try { const r = req.headers.get("referer"); tab = r ? new URL(r).searchParams.get("tab") ?? "" : ""; } catch {}
  return NextResponse.redirect(externalUrl(req, `/settings?${tab ? `tab=${encodeURIComponent(tab)}&` : ""}saved=1`), 303);
}
