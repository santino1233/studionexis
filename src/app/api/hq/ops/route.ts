import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { audit } from "@/lib/hq";
import bcrypt from "bcryptjs";

// HQ operations API (Wave 16): tickets, announcements, releases, KB,
// flags, team, global settings. SUPERADMIN only.
export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role !== "SUPERADMIN") return NextResponse.json({ error: "not found" }, { status: 404 });
  const form = await req.formData();
  const op = String(form.get("op") ?? "");
  const backRaw = String(form.get("back") ?? "");
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : `/${process.env.HQ_PATH ?? "hq"}`;
  const s = (k: string) => String(form.get(k) ?? "").trim();

  if (op === "ticket-update") {
    const t = await db.supportTicket.findUnique({ where: { id: s("id") } });
    if (t) {
      await db.supportTicket.update({
        where: { id: t.id },
        data: {
          status: ["OPEN", "PENDING", "WAITING", "RESOLVED"].includes(s("status")) ? s("status") : t.status,
          priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s("priority")) ? s("priority") : t.priority,
          assignee: s("assignee") || null,
          githubIssue: s("githubIssue") || null,
          fixVersion: s("fixVersion") || null,
          internalNotes: s("internalNotes") || t.internalNotes,
        },
      });
      audit({ tenantId: t.tenantId, actor: auth.name, action: "ticket-update", detail: `${t.subject} → ${s("status")}` });
    }
  } else if (op === "ticket-reply") {
    const t = await db.supportTicket.findUnique({ where: { id: s("id") } });
    const text = s("text").slice(0, 4000);
    if (t && text) {
      const messages = [...(t.messages as unknown[]), { from: "hq", name: auth.name, text, at: new Date().toISOString() }];
      await db.supportTicket.update({ where: { id: t.id }, data: { messages: messages as Prisma.InputJsonValue, status: "PENDING" } });
    }
  } else if (op === "announce") {
    await db.announcement.create({
      data: {
        title: s("title").slice(0, 150), body: s("body").slice(0, 2000),
        kind: ["info", "maintenance", "security", "release"].includes(s("kind")) ? s("kind") : "info",
        audience: {
          all: s("audience") === "all",
          trial: s("audience") === "trial",
          plans: s("audience") === "plan" ? [s("plan")] : [],
          tenantIds: s("audience") === "tenant" ? [s("tenantId")] : [],
        } as Prisma.InputJsonValue,
        activeUntil: s("until") ? new Date(s("until")) : null,
      },
    });
    audit({ actor: auth.name, action: "broadcast", detail: s("title") });
  } else if (op === "announce-delete") {
    await db.announcement.delete({ where: { id: s("id") } }).catch(() => {});
  } else if (op === "release") {
    await db.release.create({ data: { version: s("version").slice(0, 20), title: s("title").slice(0, 150), notes: s("notes").slice(0, 5000) } });
    audit({ actor: auth.name, action: "release-published", detail: s("version") });
  } else if (op === "kb-save") {
    const tags = s("tags").split(",").map((x) => x.trim()).filter(Boolean);
    if (s("id")) await db.kbArticle.update({ where: { id: s("id") }, data: { title: s("title"), body: s("body"), tags } });
    else await db.kbArticle.create({ data: { title: s("title").slice(0, 150), body: s("body").slice(0, 20000), tags } });
  } else if (op === "kb-delete") {
    await db.kbArticle.delete({ where: { id: s("id") } }).catch(() => {});
  } else if (op === "flag-save") {
    const cur = await db.globalSetting.findUnique({ where: { key: "featureFlags" } });
    const flags = ((cur?.value ?? []) as { id: string; label: string; tenants: string[] }[]).filter((f) => f.id !== s("fid"));
    if (s("mode") !== "delete") {
      flags.push({ id: s("fid").toLowerCase().replace(/[^a-z0-9-]/g, "-"), label: s("label") || s("fid"), tenants: s("tenants").split(",").map((x) => x.trim()).filter(Boolean) });
    }
    await db.globalSetting.upsert({ where: { key: "featureFlags" }, update: { value: flags as Prisma.InputJsonValue }, create: { key: "featureFlags", value: flags as Prisma.InputJsonValue } });
    audit({ actor: auth.name, action: "feature-flag", detail: s("fid") });
  } else if (op === "team-add") {
    const email = s("email").toLowerCase();
    const pw = s("password");
    if (email && pw.length >= 8 && !(await db.user.findFirst({ where: { email, tenantId: null } }))) {
      await db.user.create({ data: { email, name: s("name") || email, role: "SUPERADMIN", passwordHash: await bcrypt.hash(pw, 10), phone: s("label") || null } });
      audit({ actor: auth.name, action: "hq-team-add", detail: `${email} (${s("label")})` });
    }
  } else if (op === "team-toggle") {
    const u = await db.user.findFirst({ where: { id: s("id"), tenantId: null, role: "SUPERADMIN" } });
    if (u && u.email !== "owner@nexis-hq.com") await db.user.update({ where: { id: u.id }, data: { active: !u.active } });
  } else if (op === "gset") {
    await db.globalSetting.upsert({
      where: { key: "platform" },
      update: { value: { maintenanceBanner: s("maintenanceBanner").slice(0, 300) } as Prisma.InputJsonValue },
      create: { key: "platform", value: { maintenanceBanner: s("maintenanceBanner").slice(0, 300) } as Prisma.InputJsonValue },
    });
    audit({ actor: auth.name, action: "global-settings", detail: s("maintenanceBanner") ? "maintenance banner set" : "maintenance banner cleared" });
  } else if (op === "custom-site-status") {
    const next = s("status");
    if (["NEW", "IN_PROGRESS", "DELIVERED"].includes(next)) {
      const o = await db.customSiteOrder.findUnique({ where: { id: s("id") } });
      if (o) {
        await db.customSiteOrder.update({ where: { id: o.id }, data: { status: next } });
        audit({ tenantId: o.tenantId, actor: auth.name, action: "custom-site-status", detail: `${o.id} → ${next}` });
      }
    }
  } else if (op === "email-resend") {
    const e = await db.emailLog.findUnique({ where: { id: s("id") } });
    if (e) {
      const { sendEmail } = await import("@/lib/mailer");
      await sendEmail({ tenantId: e.tenantId, to: e.to, subject: e.subject, body: e.body });
    }
  }
  return NextResponse.redirect(externalUrl(req, back), 303);
}
