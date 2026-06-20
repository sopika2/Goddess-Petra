import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Anonymous (to the public) confessions, approved by the admin before they show.
// CRITICAL: the public wall must NEVER expose the submitter's identity. That's
// why listPublic selects ONLY non-identifying columns and returns PublicConfession;
// identity (user_id/username/name/image/ip) is admin-only via listForAdmin.

export type ConfessionStatus = "pending" | "approved" | "rejected";

/** Full record — admin only. */
export interface Confession {
  id: string;
  userId: string;
  username: string;
  name: string;
  image: string;
  body: string;
  status: ConfessionStatus;
  ip: string;
  createdAt: string;
  decidedAt: string;
}

/** What the public wall is allowed to see — no identity, ever. */
export interface PublicConfession {
  id: string;
  body: string;
  createdAt: string;
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

function rowToConfession(r: any): Confession {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username,
    name: r.name,
    image: r.image,
    body: r.body,
    status:
      r.status === "approved"
        ? "approved"
        : r.status === "rejected"
          ? "rejected"
          : "pending",
    ip: r.ip,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
  };
}

export async function createConfession(c: {
  userId: string;
  username: string;
  name: string;
  image: string;
  body: string;
  ip: string;
}): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO confessions
       (id, user_id, username, name, image, body, status, ip, created_at, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, '')`,
    [
      crypto.randomUUID(),
      (c.userId || "").slice(0, 40),
      (c.username || "").slice(0, 40),
      (c.name || "").slice(0, 120),
      (c.image || "").slice(0, 300),
      (c.body || "").slice(0, 2000),
      (c.ip || "").slice(0, 64),
      new Date().toISOString(),
    ],
  );
}

/** Public wall: approved only, identity stripped at the SQL layer. */
export async function listPublic(limit = 100): Promise<PublicConfession[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT id, body, created_at FROM confessions
     WHERE status = 'approved'
     ORDER BY created_at DESC LIMIT ${clampInt(limit, 1, 1000)}`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

/** Admin moderation list — full identity. Pending first, then newest. */
export async function listForAdmin(limit = 300): Promise<Confession[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM confessions
     ORDER BY (status = 'pending') DESC, created_at DESC
     LIMIT ${clampInt(limit, 1, 2000)}`,
  );
  return (rows as any[]).map(rowToConfession);
}

export async function countPending(): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT COUNT(*) c FROM confessions WHERE status = 'pending'",
  );
  return Number((rows as any[])[0]?.c) || 0;
}

export async function setStatus(
  id: string,
  status: ConfessionStatus,
): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE confessions SET status = ?, decided_at = ? WHERE id = ?",
    [status, new Date().toISOString(), id],
  );
}

export async function deleteConfession(id: string): Promise<void> {
  const pool = await db();
  await pool.query("DELETE FROM confessions WHERE id = ?", [id]);
}

/** Epoch ms of this user's most recent submission (for rate-limiting). */
export async function lastConfessionAt(userId: string): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT created_at FROM confessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  const r = (rows as any[])[0];
  return r ? new Date(r.created_at).getTime() : 0;
}
