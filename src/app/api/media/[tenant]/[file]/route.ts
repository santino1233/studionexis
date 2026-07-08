import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ROOT = "/opt/nexis/uploads";
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string; file: string }> }) {
  const { tenant, file } = await params;
  // basename() on both segments defeats any traversal attempt
  const safe = path.join(ROOT, path.basename(tenant), path.basename(file));
  const mime = MIME[path.extname(safe).toLowerCase()];
  if (!mime) return new NextResponse("not found", { status: 404 });
  try {
    const buf = await readFile(safe);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
