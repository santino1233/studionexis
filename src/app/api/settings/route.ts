import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { verifyStripeKey } from "@/lib/stripe";
import { randomBytes } from "crypto";
import { WEBHOOK_EVENTS, webhooksOf, appsOf } from "@/lib/webhooks";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "THB", "VND", "IDR", "PHP", "MYR", "JPY", "KRW", "AED", "INR"];

export async function POST(req: Request) {
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
      if (!/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw) || raw.endsWith("nexis.revsports.ca")) {
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
  } else if (section === "webhook-add") {
    const prev = (tenant.policies ?? {}) as Record<string, unknown>;
    const url = String(form.get("url") ?? "").trim();
    const events = WEBHOOK_EVENTS.filter((e) => form.getAll("events").includes(e));
    if (/^https:\/\//.test(url) && events.length > 0) {
      const hooks = webhooksOf(tenant.policies);
      if (hooks.length < 5) {
        hooks.push({ url, secret: `whsec_${randomBytes(16).toString("hex")}`, events });
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
    if (form.has("telegramToken")) { set("telegramToken", String(form.get("telegramToken")).trim()); set("telegramChatId", String(form.get("telegramChatId")).trim()); }
    if (form.has("ga4") || form.has("meta") || form.has("tiktok")) {
      apps.pixels = {
        ga4: String(form.get("ga4") ?? "").trim() || undefined,
        meta: String(form.get("meta") ?? "").trim() || undefined,
        tiktok: String(form.get("tiktok") ?? "").trim() || undefined,
      };
    }
    if (String(form.get("regenIcal")) === "1") apps.icalToken = randomBytes(12).toString("hex");
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
          payAtStudio: form.get("payAtStudio") === "on",
        },
      },
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
