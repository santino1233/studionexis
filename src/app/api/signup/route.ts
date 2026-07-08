import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "studio";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const studioName = String(form.get("studioName") ?? "").trim();
  const ownerName = String(form.get("ownerName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!studioName || !ownerName || !email || password.length < 8) {
    return NextResponse.redirect(externalUrl(req, "/signup?error=missing"), 303);
  }

  const base = slugify(studioName);
  try {
    const { user, tenant } = await db.$transaction(async (tx) => {
      let slug = base;
      for (let i = 2; await tx.tenant.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: studioName,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 86400_000),
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: ownerName,
          role: "OWNER",
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      return { user, tenant };
    });

    await createSession({ userId: user.id, tenantId: tenant.id, role: user.role, name: user.name });
    return NextResponse.redirect(externalUrl(req, "/welcome"), 303);
  } catch {
    // Most likely the email is already in use for a tenant.
    return NextResponse.redirect(externalUrl(req, "/signup?error=exists"), 303);
  }
}
