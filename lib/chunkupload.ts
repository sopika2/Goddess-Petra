import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Chunked ("batched") uploads for files over the single-shot limit. The
// client slices the file into ~8 MB pieces and calls start → chunk×N →
// finish; the server appends each piece to a temp .part file and only moves
// it into data/uploads/ once the declared size matches exactly. Sessions are
// in-memory (single-process deploy); abandoned temp files are swept
// opportunistically after an hour.
//
// NOTE: files that land in data/uploads (including everything subs send in
// chat) are permanent — there is deliberately NO delete function in this
// module or anywhere else in the app. Removal is a manual, on-disk decision.

export const CHUNK_LIMIT = 9 * 1024 * 1024; // per-piece ceiling (client sends 8 MB)
const STALE_MS = 60 * 60 * 1000; // sweep sessions older than 1h

interface Session {
  owner: string; // "admin" or the visitor's user id — chunks must match
  ext: string;
  size: number; // declared total bytes
  received: number;
  nextIndex: number;
  ts: number;
}

const sessions = new Map<string, Session>();

const tmpDir = () => path.join(process.cwd(), "data", "uploads", "tmp");
const finalDir = () => path.join(process.cwd(), "data", "uploads");
const partPath = (id: string) => path.join(tmpDir(), `${id}.part`);

async function sweepStale(): Promise<void> {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.ts > STALE_MS) {
      sessions.delete(id);
      try {
        await fs.unlink(partPath(id));
      } catch {
        /* already gone */
      }
    }
  }
}

export interface ChunkError {
  error: string;
  status: number;
}

/** Open an upload session. Validates type + size up front so a client never
 *  ships 90 MB just to be told no. */
export async function startUpload(opts: {
  owner: string;
  type: string;
  size: number;
  extByType: Record<string, string>;
  maxBytes: number;
}): Promise<{ uploadId: string } | ChunkError> {
  await sweepStale();
  const ext = opts.extByType[opts.type];
  if (!ext) return { error: "Unsupported file type.", status: 400 };
  const size = Math.floor(Number(opts.size));
  if (!isFinite(size) || size < 1 || size > opts.maxBytes) {
    return {
      error: `Too large (max ${Math.floor(opts.maxBytes / 1024 / 1024)} MB).`,
      status: 400,
    };
  }
  const uploadId = crypto.randomBytes(16).toString("hex");
  await fs.mkdir(tmpDir(), { recursive: true });
  await fs.writeFile(partPath(uploadId), Buffer.alloc(0));
  sessions.set(uploadId, {
    owner: opts.owner,
    ext,
    size,
    received: 0,
    nextIndex: 0,
    ts: Date.now(),
  });
  return { uploadId };
}

/** Append one piece. Pieces must arrive in order and stay within the
 *  declared total — anything else kills the session. */
export async function appendChunk(
  uploadId: string,
  owner: string,
  index: number,
  buf: Buffer,
): Promise<{ received: number } | ChunkError> {
  const s = sessions.get(uploadId);
  if (!s || s.owner !== owner) {
    return { error: "Unknown upload.", status: 404 };
  }
  const kill = async (error: string): Promise<ChunkError> => {
    sessions.delete(uploadId);
    try {
      await fs.unlink(partPath(uploadId));
    } catch {
      /* ignore */
    }
    return { error, status: 400 };
  };
  if (index !== s.nextIndex) return kill("Chunk out of order.");
  if (buf.length < 1 || buf.length > CHUNK_LIMIT) return kill("Bad chunk size.");
  if (s.received + buf.length > s.size) return kill("More data than declared.");
  await fs.appendFile(partPath(uploadId), buf);
  s.received += buf.length;
  s.nextIndex += 1;
  s.ts = Date.now();
  return { received: s.received };
}

/** Seal the session: sizes must match exactly, then the file becomes a
 *  normal permanent /media upload. */
export async function finishUpload(
  uploadId: string,
  owner: string,
): Promise<{ url: string } | ChunkError> {
  const s = sessions.get(uploadId);
  if (!s || s.owner !== owner) {
    return { error: "Unknown upload.", status: 404 };
  }
  sessions.delete(uploadId);
  if (s.received !== s.size) {
    try {
      await fs.unlink(partPath(uploadId));
    } catch {
      /* ignore */
    }
    return { error: "Upload incomplete.", status: 400 };
  }
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${s.ext}`;
  await fs.rename(partPath(uploadId), path.join(finalDir(), name));
  return { url: `/media/${name}` };
}

export function isChunkError(r: unknown): r is ChunkError {
  return !!r && typeof r === "object" && "error" in r;
}
