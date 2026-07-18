import { NextResponse } from "next/server";
import { destroySession, clearPending2FA } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  await destroySession();
  // Clear any half-finished login-verification, but keep the 30-day trusted-
  // device cookie so "save my info" survives a normal sign-out.
  await clearPending2FA();
  return NextResponse.redirect(externalUrl(req, "/login"), 303);
}
