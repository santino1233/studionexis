import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(externalUrl(req, "/login"), 303);
}
