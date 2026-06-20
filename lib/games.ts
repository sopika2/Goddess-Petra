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

/** Parse the per-account rig config ("username = segment" per line). */
export function parseRig(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of (raw || "").split("\n")) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const handle = line.slice(0, i).trim().replace(/^@/, "").toLowerCase();
    const seg = line.slice(i + 1).trim();
    if (handle && seg) out[handle] = seg;
  }
  return out;
}

/**
 * Decide a spin result SERVER-SIDE so it can't be cheated/previewed and so it
 * honors the rig. Precedence: per-account rig → global forced → random.
 */
export function pickResult(opts: {
  segments: string[];
  forced: string;
  rigMap: Record<string, string>;
  username: string;
}): { result: string; index: number; rigged: boolean } {
  const segs = opts.segments.map((s) => String(s)).filter(Boolean);
  if (!segs.length) return { result: "", index: -1, rigged: false };

  const rig = opts.rigMap[(opts.username || "").toLowerCase()];
  if (rig && segs.includes(rig)) {
    return { result: rig, index: segs.indexOf(rig), rigged: true };
  }
  const forced = (opts.forced || "").trim();
  if (forced && segs.includes(forced)) {
    return { result: forced, index: segs.indexOf(forced), rigged: true };
  }
  const i = crypto.randomInt(0, segs.length);
  return { result: segs[i], index: i, rigged: false };
}
