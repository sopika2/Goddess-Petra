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

// ── wheel segments ────────────────────────────────────────────────────────
// A segment is written in Settings as "label", "label|kind" or
// "label|kind|payload" — so plain old labels keep working untouched.
//   tribute  → they owe money (the $ in the label feeds the debt tally)
//   info     → they must hand something over; payload = what to demand
//   reward   → she gives something back; payload = /media/... picture or video
//   task     → an order to obey; payload = optional detail

export type SegmentKind = "tribute" | "info" | "reward" | "task";

export interface WheelSegment {
  label: string;
  kind: SegmentKind;
  payload: string;
}

const KINDS: SegmentKind[] = ["tribute", "info", "reward", "task"];

export function parseSegment(raw: string): WheelSegment {
  const parts = String(raw || "").split("|");
  const label = (parts[0] || "").trim();
  const k = (parts[1] || "").trim().toLowerCase() as SegmentKind;
  return {
    label,
    kind: KINDS.includes(k) ? k : "tribute",
    payload: (parts.slice(2).join("|") || "").trim(),
  };
}

export function parseSegments(raw: string[]): WheelSegment[] {
  return (raw || []).map(parseSegment).filter((s) => s.label.length > 0);
}

/**
 * Choose a landing segment, honouring (in order): a per-account forced result,
 * the global forced result, then chance — always skipping anything on this
 * account's excluded list. The player is never told which of these happened.
 */
export function chooseSegment(opts: {
  segments: WheelSegment[];
  excluded: string[];
  rigResult?: string;
  rigActive?: boolean;
  globalForced?: string;
}): { segment: WheelSegment; index: number; rigged: boolean } | null {
  const blocked = new Set((opts.excluded || []).map((s) => s.toLowerCase()));
  // Index against the FULL list so the client animates to the right slice.
  const allowed = opts.segments
    .map((seg, index) => ({ seg, index }))
    .filter((x) => !blocked.has(x.seg.label.toLowerCase()));
  if (!allowed.length) return null;

  const findAllowed = (label: string) =>
    allowed.find((x) => x.seg.label === label);

  if (opts.rigActive && opts.rigResult) {
    const hit = findAllowed(opts.rigResult);
    if (hit) return { segment: hit.seg, index: hit.index, rigged: true };
  }
  const forced = (opts.globalForced || "").trim();
  if (forced) {
    const hit = findAllowed(forced);
    if (hit) return { segment: hit.seg, index: hit.index, rigged: true };
  }
  const pick = allowed[crypto.randomInt(0, allowed.length)];
  return { segment: pick.seg, index: pick.index, rigged: false };
}

// ── roulette ──────────────────────────────────────────────────────────────
// A real 37-slot wheel (0 green + 1–36 red/black). The sub bets red or black;
// the house edge plus the green zero means she wins more than half the time —
// and "winning" only buys them mercy, never money.

export type RouletteColor = "red" | "black" | "green";

/** Standard European roulette red numbers. */
const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function rouletteColor(n: number): RouletteColor {
  if (n === 0) return "green";
  return RED.has(n) ? "red" : "black";
}

/** Every slot in wheel order, for rendering. */
export const ROULETTE_SLOTS: number[] = Array.from({ length: 37 }, (_, i) => i);

/**
 * Decide a roulette slot server-side. `forced` (from a per-account rig) may be
 * a colour — we then pick a random slot of that colour so it still looks fair.
 */
export function spinRoulette(forced?: string): {
  number: number;
  color: RouletteColor;
  rigged: boolean;
} {
  const want = (forced || "").trim().toLowerCase();
  if (want === "red" || want === "black" || want === "green") {
    const pool = ROULETTE_SLOTS.filter((n) => rouletteColor(n) === want);
    const n = pool[crypto.randomInt(0, pool.length)];
    return { number: n, color: want as RouletteColor, rigged: true };
  }
  const n = crypto.randomInt(0, 37);
  return { number: n, color: rouletteColor(n), rigged: false };
}

// ── the debt ledger ───────────────────────────────────────────────────────
// No currency, no wallet — just a running tally of what the wheel has already
// decided they owe. Amounts are read straight out of the result text, so the
// wheel segments she writes ("$20 tribute") are the single source of truth.

/** Pull a money amount out of a result label. "$20 tribute" → 20, else 0. */
export function parseAmount(result: string): number {
  const m = /\$\s?(\d+(?:\.\d+)?)/.exec(result || "");
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface PlayerRecord {
  spins: number;
  owed: number;
  lastResult: string;
  lastAt: string;
  recent: { result: string; ts: string; game: string }[];
}

/** One player's file: how many times they've played and what they racked up. */
export async function playerRecord(userId: string): Promise<PlayerRecord> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT game, result, ts FROM game_rolls WHERE user_id = ?
     ORDER BY ts DESC LIMIT 2000`,
    [userId],
  );
  const list = rows as any[];
  const owed = list.reduce((sum, r) => sum + parseAmount(r.result), 0);
  return {
    spins: list.length,
    owed,
    lastResult: list[0]?.result || "",
    lastAt: list[0]?.ts || "",
    recent: list.slice(0, 12).map((r) => ({
      result: r.result,
      ts: r.ts,
      game: r.game,
    })),
  };
}

export interface DebtorRow {
  userId: string;
  username: string;
  name: string;
  spins: number;
  owed: number;
}

/** Public wall of shame — who the wheel has bled the most. */
export async function topDebtors(limit = 10): Promise<DebtorRow[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT user_id, username, name, result FROM game_rolls
     WHERE user_id <> '' ORDER BY ts DESC LIMIT 5000`,
  );
  const by = new Map<string, DebtorRow>();
  for (const r of rows as any[]) {
    const cur =
      by.get(r.user_id) ||
      ({
        userId: r.user_id,
        username: r.username || "",
        name: r.name || "",
        spins: 0,
        owed: 0,
      } as DebtorRow);
    cur.spins += 1;
    cur.owed += parseAmount(r.result);
    if (r.username) cur.username = cur.username || r.username;
    by.set(r.user_id, cur);
  }
  return [...by.values()]
    .sort((a, b) => b.owed - a.owed || b.spins - a.spins)
    .slice(0, clampInt(limit, 1, 100));
}

/** Live ticker of what the herd just landed on (no IPs, ever). */
export async function recentPublicRolls(
  limit = 12,
): Promise<{ username: string; result: string; ts: string; game: string }[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT username, result, ts, game FROM game_rolls
     WHERE username <> '' ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 50)}`,
  );
  return (rows as any[]).map((r) => ({
    username: r.username,
    result: r.result,
    ts: r.ts,
    game: r.game,
  }));
}

// ── per-account rigging (managed on the admin Games page) ─────────────────
// remaining: -1 = unlimited, >0 = that many forced spins (then auto-clears).

export interface RigRule {
  userId: string;
  username: string;
  /** Force this exact segment. Invisible to the player. */
  result: string;
  remaining: number;
  /** Segment labels this account can never land on. */
  excluded: string[];
  /** This account's own wheel. Empty = they get the default from Settings. */
  segments: string[];
  updatedAt: string;
}

/** Which wheel this account actually plays: theirs if set, else the default. */
export function effectiveSegments(
  defaults: string[],
  rig?: RigRule | null,
): string[] {
  return rig && rig.segments.length ? rig.segments : defaults;
}

function parseList(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function rowToRig(r: any): RigRule {
  return {
    userId: r.user_id,
    username: r.username,
    result: r.result,
    remaining: r.remaining,
    excluded: parseList(r.excluded),
    segments: parseList(r.segments),
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

/**
 * Set (or clear) a per-account rig. The row also carries that account's
 * excluded segments, so it's dropped only when BOTH controls are empty.
 */
export async function setRig(opts: {
  userId: string;
  username: string;
  result: string;
  remaining: number;
  excluded?: string[];
  segments?: string[];
}): Promise<void> {
  const pool = await db();
  const userId = (opts.userId || "").slice(0, 40);
  if (!userId) return;
  const bans = (opts.excluded || []).map(String).filter(Boolean).slice(0, 50);
  const own = (opts.segments || []).map(String).filter(Boolean).slice(0, 24);
  const noForce = !opts.result.trim() || opts.remaining === 0;
  // Only drop the row once every control on it is empty.
  if (noForce && !bans.length && !own.length) {
    await pool.query("DELETE FROM game_rigs WHERE user_id = ?", [userId]);
    return;
  }
  await pool.query(
    `INSERT INTO game_rigs
       (user_id, username, result, remaining, updated_at, excluded, segments)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE username=VALUES(username), result=VALUES(result),
       remaining=VALUES(remaining), updated_at=VALUES(updated_at),
       excluded=VALUES(excluded), segments=VALUES(segments)`,
    [
      userId,
      (opts.username || "").slice(0, 40),
      noForce ? "" : opts.result.slice(0, 160),
      noForce ? 0 : Math.max(-1, Math.floor(opts.remaining)),
      new Date().toISOString(),
      JSON.stringify(bans),
      JSON.stringify(own),
    ],
  );
}

/**
 * Consume one use of a finite rig. When it runs out we clear the forced result
 * but KEEP the row if it still carries exclusions — those aren't spent.
 */
export async function decrementRig(userId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE game_rigs SET remaining = remaining - 1 WHERE user_id = ? AND remaining > 0",
    [userId],
  );
  await pool.query(
    `UPDATE game_rigs SET result = '' WHERE user_id = ? AND remaining = 0`,
    [userId],
  );
  await pool.query(
    `DELETE FROM game_rigs
     WHERE user_id = ? AND remaining = 0
       AND (excluded IS NULL OR excluded = '' OR excluded = '[]')
       AND (segments IS NULL OR segments = '' OR segments = '[]')`,
    [userId],
  );
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
