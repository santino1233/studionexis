import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { Prisma } from "@prisma/client";
import { guardCap } from "@/lib/rbac-server";

// Copy the current location's class-type catalog to the account's other
// locations. Class types carry no money, so this is a safe sync. Only adds
// types missing (by name) at each sibling — never overwrites or deletes.
export async function POST(req: Request) {
  const __denied = await guardCap(req, "manage_locations");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role !== "OWNER") return NextResponse.redirect(externalUrl(req, "/login"), 303);
  const current = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!current?.organizationId) return NextResponse.redirect(externalUrl(req, "/locations?error=1"), 303);

  const siblings = await db.tenant.findMany({ where: { organizationId: current.organizationId, id: { not: current.id } } });
  const source = await db.classType.findMany({ where: { tenantId: current.id } });

  let copied = 0;
  for (const sib of siblings) {
    const existing = new Set((await db.classType.findMany({ where: { tenantId: sib.id }, select: { name: true } })).map((c) => c.name.toLowerCase()));
    const toAdd = source.filter((s) => !existing.has(s.name.toLowerCase()));
    for (const s of toAdd) {
      await db.classType.create({
        data: {
          tenantId: sib.id,
          name: s.name, description: s.description, difficulty: s.difficulty, format: s.format,
          color: s.color, kind: s.kind, durationMin: s.durationMin, capacity: s.capacity, price: s.price,
          active: s.active, benefits: s.benefits, goodFor: s.goodFor, tags: s.tags, equipment: s.equipment,
          muscles: s.muscles, publicByDefault: s.publicByDefault, recurringSlots: s.recurringSlots as Prisma.InputJsonValue,
        },
      });
      copied++;
    }
  }
  const { audit } = await import("@/lib/hq");
  audit({ tenantId: current.id, actor: auth.name, role: auth.role, action: "catalog-synced", detail: `${copied} class types → ${siblings.length} locations` });
  return NextResponse.redirect(externalUrl(req, `/locations?copied=${copied}`), 303);
}
