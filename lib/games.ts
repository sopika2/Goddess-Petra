import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface GameRoll {
  id: string;
  ts: string;
  game: string;
  userId: string;
  username: string;
  name: string;
  result: string;
  rigged: boolean;
  ip: string;
}

function rowToRoll(r: any): GameRoll {
  return {
    id: r.id,
    ts: r.ts,
    game: r.game,
    userId: r.user_id,
    username: r.username,
    name: r.name,
    result: r.result,
    rigged: r.rigged === 1,
    ip: r.ip,
  };
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

export async function logRoll(e: Omit<GameRoll, "id" | "ts">): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO game_rolls (id, ts, game, user_id, username, name, result, rigged, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      new Date().toISOString(),
      (e.game || "").slice(0, 16),
      (e.userId || "").slice(0, 40),
      (e.username || "").slice(0, 40),
      (e.name || "").slice(0, 120),
      (e.result || "").slice(0, 160),
      e.rigged ? 1 : 0,
      (e.ip || "").slice(0, 64),
    ],
  );
}

export async function listRolls(limit = 300): Promise<GameRoll[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM game_rolls ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
  );
  return (rows as any[]).map(rowToRoll);
}

export async function searchRolls(q: string, limit = 300): Promise<GameRoll[]> {
  const pool = await db();
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT * FROM game_rolls
     WHERE username LIKE ? OR name LIKE ? OR result LIKE ? OR game LIKE ? OR ip LIKE ?
     ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 2000)}`,
    [like, like, like, like, like],
  );
  return (rows as any[]).map(rowToRoll);
}

/** Epoch ms of a user's most recent roll (0 if none) — for rate limiting. */
export async function lastRollAt(userId: string): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT ts FROM game_rolls WHERE user_id = ? ORDER BY ts DESC LIMIT 1",
    [userId],
  );
  const r = (rows as any[])[0];
  if (!r) return 0;
  const t = Date.parse(r.ts);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Decide a spin result SERVER-SIDE (global forced, else random). Per-account
 * rigging is applied separately in the spin route via getRig/decrementRig so it
 * can carry a per-account "how many times" count. Precedence (in the route):
 * per-account rig → global forced → random.
 */
export function pickResult(opts: {
  segments: string[];
  forced: string;
}): { result: string; index: number; rigged: boolean } {
  const segs = opts.segments.map((s) => String(s)).filter(Boolean);
  if (!segs.length) return { result: "", index: -1, rigged: false };

  const forced = (opts.forced || "").trim();
  if (forced && segs.includes(forced)) {
    return { result: forced, index: segs.indexOf(forced), rigged: true };
  }
  const i = crypto.randomInt(0, segs.length);
  return { result: segs[i], index: i, rigged: false };
}

// ── per-account rigging (managed on the admin Games page) ─────────────────
// remaining: -1 = unlimited, >0 = that many forced spins (then auto-clears).

export interface RigRule {
  userId: string;
  username: string;
  result: string;
  remaining: number;
  updatedAt: string;
}

function rowToRig(r: any): RigRule {
  return {
    userId: r.user_id,
    username: r.username,
    result: r.result,
    remaining: r.remaining,
    updatedAt: r.updated_at,
  };
}

export async function getRig(userId: string): Promise<RigRule | null> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM game_rigs WHERE user_id = ? LIMIT 1",
    [userId],
  );
  const r = (rows as any[])[0];
  return r ? rowToRig(r) : null;
}

export async function listRigs(): Promise<RigRule[]> {
  const pool = await db();
  const [rows] = await pool.query("SELECT * FROM game_rigs");
  return (rows as any[]).map(rowToRig);
}

/** Set (or clear) a per-account rig. result="" or remaining=0 clears it. */
export async function setRig(
  userId: string,
  username: string,
  result: string,
  remaining: number,
): Promise<void> {
  const pool = await db();
  if (!userId) return;
  if (!result.trim() || remaining === 0) {
    await pool.query("DELETE FROM game_rigs WHERE user_id = ?", [userId]);
    return;
  }
  await pool.query(
    `INSERT INTO game_rigs (user_id, username, result, remaining, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE username=VALUES(username), result=VALUES(result),
       remaining=VALUES(remaining), updated_at=VALUES(updated_at)`,
    [
      userId.slice(0, 40),
      (username || "").slice(0, 40),
      result.slice(0, 160),
      Math.max(-1, Math.floor(remaining)),
      new Date().toISOString(),
    ],
  );
}

/** Consume one use of a finite rig (called after a rigged spin is used). */
export async function decrementRig(userId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE game_rigs SET remaining = remaining - 1 WHERE user_id = ? AND remaining > 0",
    [userId],
  );
  await pool.query("DELETE FROM game_rigs WHERE user_id = ? AND remaining = 0", [
    userId,
  ]);
}

// ── account roster (everyone who has ever signed in with X) ───────────────
export interface Account {
  id: string;
  username: string;
  name: string;
  lastSeen: string;
  logins: number;
}

export async function listAccounts(limit = 1000): Promise<Account[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT twitter_id AS id,
            MAX(twitter_username) AS username,
            MAX(twitter_name) AS name,
            MAX(ts) AS last_seen,
            COUNT(*) AS logins
     FROM logins
     WHERE twitter_id <> ''
     GROUP BY twitter_id
     ORDER BY last_seen DESC
     LIMIT ${clampInt(limit, 1, 5000)}`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    username: r.username || "",
    name: r.name || "",
    lastSeen: r.last_seen || "",
    logins: Number(r.logins) || 0,
  }));
}
