import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { guardCap } from "@/lib/rbac-server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const __denied = await guardCap(req, "manage_expenses");
  if (__denied) return __denied;
  const auth = await getSession();
  if (!auth || auth.role === "INSTRUCTOR") return NextResponse.redirect(externalUrl(req, "/login"), 303);

  const { id } = await params;
  if (String((await req.formData()).get("action")) === "delete") {
    await db.expense.deleteMany({ where: { id, tenantId: auth.tenantId } });
  }
  return NextResponse.redirect(externalUrl(req, "/expenses"), 303);
}
