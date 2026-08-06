import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { SECTION_IDS, type SectionId } from "@/components/site/types";
import { guardCap } from "@/lib/rbac-server";

// The mini website builder (Wave 11 Y2): every POST merges one section's
// content into the tenant.website JSON blob — never replaces it wholesale.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_website");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || ["STAFF", "INSTRUCTOR"].includes(auth.role)) return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const section = String(form.get("section") ?? "");
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const prev = (tenant.website ?? {}) as Record<string, unknown>;
  const pick = (k: string) => String(form.get(k) ?? "").trim();
  let patch: Record<string, unknown> = {};

  if (section === "toggle") {
    const id = pick("id") as SectionId;
    if (!(SECTION_IDS as readonly string[]).includes(id)) return NextResponse.redirect(externalUrl(req, "/website"), 303);
    const sections = { ...((prev.sections as Record<string, boolean>) ?? {}) };
    sections[id] = pick("show") === "1";
    patch = { sections };
  } else if (section === "about") {
    patch = {
      philosophy: pick("philosophy"),
      why: pick("why").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6),
    };
  } else if (section === "team") {
    const bios = { ...((prev.teamBios as Record<string, { bio?: string; photo?: string; hidden?: boolean }>) ?? {}) };
    for (const [key, val] of form.entries()) {
      if (!key.startsWith("bio_")) continue;
      const userId = key.slice(4);
      const user = await db.user.findFirst({ where: { id: userId, tenantId: auth.tenantId } });
      if (!user) continue;
      bios[userId] = { ...bios[userId], bio: String(val).trim() };
    }
    patch = { teamBios: bios };
  } else if (section === "team-toggle") {
    const userId = pick("userId");
    const user = await db.user.findFirst({ where: { id: userId, tenantId: auth.tenantId } });
    if (user) {
      const bios = { ...((prev.teamBios as Record<string, { bio?: string; photo?: string; hidden?: boolean }>) ?? {}) };
      bios[userId] = { ...bios[userId], hidden: !(bios[userId]?.hidden ?? false) };
      patch = { teamBios: bios };
    }
  } else if (section === "testimonials") {
    const rows = [];
    for (let i = 0; i < 50; i++) {
      const quote = pick(`quote${i}`);
      const name = pick(`name${i}`);
      if (quote && name) rows.push({ quote, name });
    }
    patch = { testimonials: rows };
  } else if (section === "faqs") {
    const rows = [];
    for (let i = 0; i < 50; i++) {
      const q = pick(`q${i}`);
      const a = pick(`a${i}`);
      if (q && a) rows.push({ q, a });
    }
    patch = { faqs: rows };
  } else if (section === "reorder") {
    const base = ["about", "classes", "schedule", "team", "pricing", "testimonials", "gallery", "faq"];
    const id = pick("id");
    const dir = pick("dir") === "up" ? -1 : 1;
    const saved = ((prev.sectionOrder as string[]) ?? []).filter((x) => base.includes(x));
    const order = [...saved, ...base.filter((x) => !saved.includes(x))];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < order.length) {
      [order[i], order[j]] = [order[j], order[i]];
    }
    patch = { sectionOrder: order };
  } else if (section === "contact") {
    patch = {
      address: pick("address"),
      phoneNumber: pick("phoneNumber"),
      hours: pick("hours"),
      mapUrl: pick("mapUrl"),
      instagram: pick("instagram").replace(/^@/, ""),
      facebook: pick("facebook"),
      tiktok: pick("tiktok").replace(/^@/, ""),
    };
  } else {
    return NextResponse.redirect(externalUrl(req, "/website"), 303);
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: { website: { ...prev, ...patch } as Prisma.InputJsonValue },
  });
  const nextRaw = String(form.get("next") ?? "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/website?saved=1";
  return NextResponse.redirect(externalUrl(req, next), 303);
}
