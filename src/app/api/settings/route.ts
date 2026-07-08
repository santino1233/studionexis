import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "THB", "VND", "IDR", "PHP", "MYR", "JPY", "KRW", "AED", "INR"];

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth) return NextResponse.redirect(externalUrl(req, "/login"), 303);

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
    if (raw === "") {
      await db.tenant.update({ where: { id: tenant.id }, data: { customDomain: null } });
    } else {
      if (!/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw) || raw.endsWith("nexis.revsports.ca")) {
        return NextResponse.redirect(externalUrl(req, "/settings?error=domain"), 303);
      }
      const taken = await db.tenant.findFirst({ where: { customDomain: raw, id: { not: tenant.id } } });
      if (taken) return NextResponse.redirect(externalUrl(req, "/settings?error=domaintaken"), 303);
      await db.tenant.update({ where: { id: tenant.id }, data: { customDomain: raw } });
    }
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
        },
      },
    });
  }
  return NextResponse.redirect(externalUrl(req, "/settings?saved=1"), 303);
}
