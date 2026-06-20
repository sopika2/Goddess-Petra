import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

/**
 * Serves uploaded media from data/uploads/. We serve through a route handler
 * instead of public/ because Next's production server (`next start`) does not
 * serve files added to public/ at runtime — only the route layer reliably
 * picks up freshly uploaded files.
 *
 * Streams the file (never buffers the whole thing into memory) and supports
 * HTTP range requests, so <video> can seek/scrub without downloading the entire
 * file per view.
 */

const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

const CACHE = "public, max-age=31536000, immutable";

// Node Readable → web ReadableStream for the Response body.
function toBody(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

export async function GET(
  req: Request,
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

  let size: number;
  try {
    const st = await stat(file);
    if (!st.isFile()) return new NextResponse("Not found", { status: 404 });
    size = st.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // Range request → 206 Partial Content (e.g. video seeking).
  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] === "" ? NaN : parseInt(m[1], 10);
      let end = m[2] === "" ? NaN : parseInt(m[2], 10);
      // Suffix range "bytes=-N" → last N bytes.
      if (Number.isNaN(start) && !Number.isNaN(end)) {
        start = Math.max(0, size - end);
        end = size - 1;
      } else {
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end)) end = size - 1;
      }
      if (start > end || start < 0 || start >= size) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }
      end = Math.min(end, size - 1);
      const chunk = end - start + 1;
      return new NextResponse(toBody(createReadStream(file, { start, end })), {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk),
          "Cache-Control": CACHE,
        },
      });
    }
  }

  // Full file, streamed.
  return new NextResponse(toBody(createReadStream(file)), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE,
    },
  });
}
