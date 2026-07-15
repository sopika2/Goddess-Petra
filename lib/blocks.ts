import "server-only";
import crypto from "node:crypto";
import { db } from "./database";
import { clientIp } from "./ip";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Site-wide bans. Two kinds:
//   - 'ip': the visitor's IP is refused everywhere (page views + actions).
//   - 'x' : a signed-in X account is refused (can't sign in, can't interact).
// Enforcement reads a small in-memory cache (15s TTL) so the hot path is a Set
// lookup, not a query. Every check fails OPEN — if the DB is unreachable we
// never wall off the whole site by accident.

export type BlockKind = "ip" | "x";

export interface Block {
  id: string;
  kind: BlockKind;
  value: string; // IP address, or the X numeric user id
  username: string; // display handle when kind='x'
  reason: string;
  createdAt: string;
}

const CACHE_TTL_MS = 15_000;
let cache: { ips: Set<string>; xids: Set<string>; at: number } | null = null;

function rowToBlock(r: any): Block {
  return {
    id: r.id,
    kind: r.kind === "x" ? "x" : "ip",
    value: r.value,
    username: r.username,
    reason: r.reason,
    createdAt: r.created_at,
  };
}

/** Invalidate the cache so the next check re-reads the table (after add/remove). */
function bust(): void {
  cache = null;
}

async function getSets(): Promise<{ ips: Set<string>; xids: Set<string> }> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache;
  const pool = await db();
  const [rows] = await pool.query("SELECT kind, value FROM blocks");
  const ips = new Set<string>();
  const xids = new Set<string>();
  for (const r of rows as any[]) {
    if (r.kind === "x") xids.add(String(r.value));
    else ips.add(String(r.value));
  }
  cache = { ips, xids, at: now };
  return cache;
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  try {
    return (await getSets()).ips.has(ip);
  } catch {
    return false; // fail open
  }
}

export async function isXBlocked(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await getSets()).xids.has(String(userId));
  } catch {
    return false; // fail open
  }
}

/** Convenience for request handlers: is this request's IP and/or signed-in X
 *  account banned? Pass the user id if you have a session. */
export async function isRequestBlocked(
  headers: Headers,
  userId?: string,
): Promise<boolean> {
  try {
    const [ipBad, xBad] = await Promise.all([
      isIpBlocked(clientIp(headers)),
      userId ? isXBlocked(userId) : Promise.resolve(false),
    ]);
    return ipBad || xBad;
  } catch {
    return false; // fail open
  }
}

export async function listBlocks(): Promise<Block[]> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM blocks ORDER BY created_at DESC LIMIT 2000",
  );
  return (rows as any[]).map(rowToBlock);
}

export async function addBlock(b: {
  kind: BlockKind;
  value: string;
  username?: string;
  reason?: string;
}): Promise<Block | null> {
  const kind: BlockKind = b.kind === "x" ? "x" : "ip";
  const value = (b.value || "").trim().slice(0, 120);
  if (!value) return null;
  const block: Block = {
    id: crypto.randomUUID(),
    kind,
    value,
    username: (b.username || "").replace(/^@/, "").slice(0, 40),
    reason: (b.reason || "").slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  const pool = await db();
  // Upsert so re-blocking an existing value just refreshes reason/handle.
  await pool.query(
    `INSERT INTO blocks (id, kind, value, username, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       username = VALUES(username), reason = VALUES(reason)`,
    [block.id, block.kind, block.value, block.username, block.reason, block.createdAt],
  );
  bust();
  return block;
}

export async function removeBlock(id: string): Promise<void> {
  const pool = await db();
  await pool.query("DELETE FROM blocks WHERE id = ?", [id]);
  bust();
}
