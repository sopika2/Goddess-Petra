import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Serves uploaded media from data/uploads/. We serve through a route handler
 * instead of public/ because Next's production server (`next start`) does not
 * serve files added to public/ at runtime — only the route layer reliably
 * picks up freshly uploaded files.
 */

const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  // Only allow plain filenames — block path traversal.
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPE_BY_EXT[ext];
  if (!type) return new NextResponse("Not found", { status: 404 });

  const file = path.join(process.cwd(), "data", "uploads", name);
  try {
    const buf = await fs.readFile(file);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
