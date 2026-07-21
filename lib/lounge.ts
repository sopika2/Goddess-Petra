import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The Lounge — a single public live chat room the whole site shares. Anyone can
// READ it; only signed-in X visitors (and the goddess) can POST. It's one flat
// feed, not per-user threads. The goddess can hide any line (soft delete). No
// media here on purpose — it's a public room, so text only.

export type RoomSender = "user" | "goddess";

export interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: RoomSender;
  body: string;
  createdAt: string;
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

function rowToRoom(r: any): RoomMessage {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username,
    name: r.name,
    image: r.image,
    sender: r.sender === "goddess" ? "goddess" : "user",
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function postRoomMessage(m: {
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: RoomSender;
  body: string;
}): Promise<RoomMessage> {
  const pool = await db();
  const msg: RoomMessage = {
    id: crypto.randomUUID(),
    userId: (m.userId || "").slice(0, 40),
    username: (m.username || "").slice(0, 40),
    name: (m.name || "").slice(0, 120),
    image: (m.image || "").slice(0, 300),
    sender: m.sender === "goddess" ? "goddess" : "user",
    body: (m.body || "").slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  await pool.query(
    `INSERT INTO room_messages
       (id, user_id, username, name, image, sender, body, hidden, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      msg.id,
      msg.userId,
      msg.username,
      msg.name,
      msg.image,
      msg.sender,
      msg.body,
      msg.createdAt,
    ],
  );
  return msg;
}

/** Newest `limit` visible lines, returned oldest→newest for display. */
export async function listRoom(limit = 80): Promise<RoomMessage[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT * FROM room_messages WHERE hidden = 0
       ORDER BY created_at DESC LIMIT ${clampInt(limit, 1, 300)}
     ) t ORDER BY created_at ASC`,
  );
  return (rows as any[]).map(rowToRoom);
}

/** Epoch ms of this user's most recent room post (for rate-limiting). */
export async function lastRoomPostAt(userId: string): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT created_at FROM room_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  const r = (rows as any[])[0];
  return r ? new Date(r.created_at).getTime() : 0;
}

/** Soft-delete (admin moderation) — drops the line from the public feed. */
export async function hideRoomMessage(id: string): Promise<void> {
  const pool = await db();
  await pool.query("UPDATE room_messages SET hidden = 1 WHERE id = ?", [id]);
}
