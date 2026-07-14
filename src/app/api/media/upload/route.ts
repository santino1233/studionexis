import { NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

const ROOT = "/opt/nexis/uploads";
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY = 8;

type Site = { heroImage?: string; galleryImages?: string[] } & Record<string, unknown>;

export async function POST(req: Request) {
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
  const site = (tenant.website ?? {}) as Site;

  // Removing a gallery image
  if (kind === "remove") {
    const url = String(form.get("url") ?? "");
    const file = path.basename(url);
    if ((site.galleryImages ?? []).includes(url)) {
      site.galleryImages = (site.galleryImages ?? []).filter((u) => u !== url);
      await db.tenant.update({ where: { id: tenant.id }, data: { website: site as Prisma.InputJsonValue } });
      await unlink(path.join(ROOT, tenant.id, file)).catch(() => {});
    }
    return NextResponse.redirect(externalUrl(req, "/settings?saved=1"), 303);
  }

  // Instructor portrait for the website team section (Wave 11 Y2)
  if (kind === "teamphoto") {
    const userId = String(form.get("userId") ?? "");
    const user = await db.user.findFirst({ where: { id: userId, tenantId: auth.tenantId } });
    if (!user) return NextResponse.redirect(externalUrl(req, "/website"), 303);
    const f = form.getAll("photos").find((x): x is File => x instanceof File && x.size > 0);
    const ext = f ? TYPES[f.type] : undefined;
    if (!f || !ext || f.size > MAX_BYTES) return NextResponse.redirect(externalUrl(req, "/website?error=phototype"), 303);
    await mkdir(path.join(ROOT, tenant.id), { recursive: true });
    const name = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    await writeFile(path.join(ROOT, tenant.id, name), Buffer.from(await f.arrayBuffer()));
    const bios = { ...(((site as Record<string, unknown>).teamBios as Record<string, { bio?: string; photo?: string }>) ?? {}) };
    if (bios[userId]?.photo) await unlink(path.join(ROOT, tenant.id, path.basename(bios[userId].photo!))).catch(() => {});
    bios[userId] = { ...bios[userId], photo: `/api/media/${tenant.id}/${name}` };
    (site as Record<string, unknown>).teamBios = bios;
    await db.tenant.update({ where: { id: tenant.id }, data: { website: site as Prisma.InputJsonValue } });
    return NextResponse.redirect(externalUrl(req, "/website?saved=1"), 303);
  }

  // Class blueprint hero image (video spec X7)
  if (kind === "classhero") {
    const classTypeId = String(form.get("classTypeId") ?? "");
    const ct = await db.classType.findFirst({ where: { id: classTypeId, tenantId: auth.tenantId } });
    if (!ct) return NextResponse.redirect(externalUrl(req, "/class-types"), 303);
    const f = form.getAll("photos").find((x): x is File => x instanceof File && x.size > 0);
    const ext = f ? TYPES[f.type] : undefined;
    if (!f || !ext || f.size > MAX_BYTES) {
      return NextResponse.redirect(externalUrl(req, `/class-types/${classTypeId}?error=phototype`), 303);
    }
    await mkdir(path.join(ROOT, tenant.id), { recursive: true });
    const name = `ct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    await writeFile(path.join(ROOT, tenant.id, name), Buffer.from(await f.arrayBuffer()));
    if (ct.heroImage) await unlink(path.join(ROOT, tenant.id, path.basename(ct.heroImage))).catch(() => {});
    await db.classType.update({ where: { id: ct.id }, data: { heroImage: `/api/media/${tenant.id}/${name}` } });
    return NextResponse.redirect(externalUrl(req, `/class-types/${classTypeId}?saved=1`), 303);
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.redirect(externalUrl(req, "/settings?error=nophoto"), 303);

  await mkdir(path.join(ROOT, tenant.id), { recursive: true });
  const saved: string[] = [];
  for (const f of files.slice(0, MAX_GALLERY)) {
    const ext = TYPES[f.type];
    if (!ext || f.size > MAX_BYTES) return NextResponse.redirect(externalUrl(req, "/settings?error=phototype"), 303);
    const name = `${kind === "hero" ? "hero" : "g"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    await writeFile(path.join(ROOT, tenant.id, name), Buffer.from(await f.arrayBuffer()));
    saved.push(`/api/media/${tenant.id}/${name}`);
    if (kind === "hero") break; // hero takes one file
  }

  if (kind === "hero") {
    if (site.heroImage) await unlink(path.join(ROOT, tenant.id, path.basename(site.heroImage))).catch(() => {});
    site.heroImage = saved[0];
  } else {
    site.galleryImages = [...(site.galleryImages ?? []), ...saved].slice(0, MAX_GALLERY);
  }
  await db.tenant.update({ where: { id: tenant.id }, data: { website: site as Prisma.InputJsonValue } });
  return NextResponse.redirect(externalUrl(req, "/settings?saved=1"), 303);
}
