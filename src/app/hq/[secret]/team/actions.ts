"use server";

// HQ admin management — server actions (Feature: New HQ Logins, card cmsepwqxe000vhlo5tk0wfi20).
//
// These create/enable/disable HQ SUPERADMIN accounts (the logins that reach
// hq.studionexis.com / Mission Control). Every action RE-ASSERTS that the caller
// is an existing HQ superadmin via assertHq(secret) — which 404s unless the
// session role is SUPERADMIN and the URL secret matches HQ_PATH — so only an
// existing HQ admin can mint or disable another. Passwords are hashed with the
// same bcrypt scheme the login route verifies against (bcrypt.compare, cost 10),
// and HQ admins are the tenantless (tenantId=null) SUPERADMIN rows the login
// route resolves. Feedback is surfaced by redirecting back with a status flag so
// the whole flow works without client JS (progressive enhancement).

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertHq, audit } from "@/lib/hq";

/** The bootstrap owner account — can never be disabled and is always listed. */
const OWNER_EMAIL = "owner@nexis-hq.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Minimum password length for a new HQ admin (stricter than customer logins). */
const MIN_PASSWORD = 10;

function backTo(secret: string, query: string): never {
  redirect(`/hq/${secret}/team?${query}`);
}

/**
 * Create a new HQ SUPERADMIN login. Guards: caller must be an HQ superadmin,
 * valid email, strong-enough password, and the email must be globally unused
 * (the login route matches by email alone, so a duplicate would be ambiguous).
 */
export async function addHqAdmin(formData: FormData): Promise<void> {
  const secret = String(formData.get("secret") ?? "");
  const auth = await assertHq(secret); // 404s unless an existing HQ superadmin

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  if (!EMAIL_RE.test(email)) backTo(secret, "err=email");
  if (password.length < MIN_PASSWORD) backTo(secret, "err=weak");
  // Login resolves users by email only (email is not globally unique in the
  // schema), so refuse if ANY user already owns this address.
  if (await db.user.findFirst({ where: { email } })) backTo(secret, "err=dupe");

  await db.user.create({
    data: {
      email,
      name: name || email,
      role: "SUPERADMIN",
      tenantId: null,
      passwordHash: await bcrypt.hash(password, 10),
      phone: label || null, // stores the informal role label, matching existing team rows
      active: true,
    },
  });
  audit({ actor: auth.name, action: "hq-admin-add", detail: `${email}${label ? ` · ${label}` : ""}` });
  backTo(secret, `ok=added&who=${encodeURIComponent(email)}`);
}

/**
 * Enable/disable an existing HQ admin login. The bootstrap owner can never be
 * disabled, and an admin cannot disable their own account (which would lock them
 * out mid-session).
 */
export async function toggleHqAdmin(formData: FormData): Promise<void> {
  const secret = String(formData.get("secret") ?? "");
  const auth = await assertHq(secret);

  const id = String(formData.get("id") ?? "");
  const u = await db.user.findFirst({ where: { id, tenantId: null, role: "SUPERADMIN" } });
  if (!u) backTo(secret, "err=notfound");
  if (u!.email === OWNER_EMAIL) backTo(secret, "err=owner");
  if (u!.id === auth.userId) backTo(secret, "err=self");

  await db.user.update({ where: { id: u!.id }, data: { active: !u!.active } });
  audit({ actor: auth.name, action: u!.active ? "hq-admin-disable" : "hq-admin-enable", detail: u!.email });
  backTo(secret, u!.active ? "ok=disabled" : "ok=enabled");
}
