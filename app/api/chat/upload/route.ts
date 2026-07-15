import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { isRequestBlocked } from "@/lib/blocks";
import {
  startUpload,
  appendChunk,
  finishUpload,
  isChunkError,
} from "@/lib/chunkupload";

// Visitor media upload for chat: pictures AND videos. Files up to 10 MB go
// in one shot; anything bigger arrives in batches (?action=start/chunk/finish
// — see lib/chunkupload.ts) so big videos survive flaky mobile connections
// and the Cloudflare tunnel. 100 MB total cap (the tunnel's practical limit).
// Everything a sub sends is PERMANENT — no delete path exists anywhere.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const SINGLE_SHOT_MAX = 10 * 1024 * 1024; // over this → batched upload
const TOTAL_MAX = 100 * 1024 * 1024;

// In-memory per-account limiter — one new upload per 10s (single-shot or
// chunked session start; individual chunks are not throttled).
const lastUploadAt = new Map<string, number>();

export async function POST(req: Request) {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const s = await getSettings();
  if (!s.chatEnabled) {
    return NextResponse.json({ error: "Chat is off." }, { status: 403 });
  }
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  const action = new URL(req.url).searchParams.get("action") || "";

  if (action === "start") {
    const last = lastUploadAt.get(user.id) || 0;
    if (Date.now() - last < 10_000) {
      return NextResponse.json({ error: "slow down ♡" }, { status: 429 });
    }
    const body = await req.json().catch(() => ({}));
    const r = await startUpload({
      owner: user.id,
      type: typeof body?.type === "string" ? body.type : "",
      size: Number(body?.size),
      extByType: EXT_BY_TYPE,
      maxBytes: TOTAL_MAX,
    });
    if (isChunkError(r)) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
    lastUploadAt.set(user.id, Date.now());
    return NextResponse.json(r);
  }

  if (action === "chunk") {
    const form = await req.formData();
    const uploadId = String(form.get("uploadId") || "");
    const index = Math.floor(Number(form.get("index")));
    const piece = form.get("chunk");
    if (
      !uploadId ||
      !isFinite(index) ||
      !piece ||
      typeof piece === "string" ||
      typeof (piece as { arrayBuffer?: unknown }).arrayBuffer !== "function"
    ) {
      return NextResponse.json({ error: "Bad chunk." }, { status: 400 });
    }
    const buf = Buffer.from(
      await (piece as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer(),
    );
    const r = await appendChunk(uploadId, user.id, index, buf);
    if (isChunkError(r)) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
    return NextResponse.json(r);
  }

  if (action === "finish") {
    const body = await req.json().catch(() => ({}));
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
    const r = await finishUpload(uploadId, user.id);
    if (isChunkError(r)) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
    return NextResponse.json(r);
  }

  // Default: single-shot upload for files ≤ 10 MB.
  const last = lastUploadAt.get(user.id) || 0;
  if (Date.now() - last < 10_000) {
    return NextResponse.json({ error: "slow down ♡" }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const upload = file as {
    type: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
  };

  const ext = EXT_BY_TYPE[upload.type];
  if (!ext) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP, GIF, MP4 or WebM only." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await upload.arrayBuffer());
  if (buf.length > SINGLE_SHOT_MAX) {
    return NextResponse.json(
      { error: "Over 10 MB — use the batched upload." },
      { status: 400 },
    );
  }

  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "data", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);

  lastUploadAt.set(user.id, Date.now());
  return NextResponse.json({ url: `/media/${name}` });
}
