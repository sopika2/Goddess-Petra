import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Two-way DMs between a signed-in X visitor and the admin ("goddess").
// A conversation is simply all rows sharing a user_id. read_admin / read_user
// track unread state for each side.

export type Sender = "user" | "goddess";

export interface Message {
  id: string;
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: Sender;
  body: string;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  username: string;
  name: string;
  image: string;
  lastBody: string;
  lastSender: Sender;
  lastAt: string;
  unread: number; // user messages the admin hasn't read
  total: number;
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

function rowToMessage(r: any): Message {
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

export async function sendMessage(m: {
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: Sender;
  body: string;
}): Promise<Message> {
  const pool = await db();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sender: Sender = m.sender === "goddess" ? "goddess" : "user";
  const body = (m.body || "").slice(0, 2000);
  await pool.query(
    `INSERT INTO messages
       (id, user_id, username, name, image, sender, body, read_admin, read_user, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      (m.userId || "").slice(0, 40),
      (m.username || "").slice(0, 40),
      (m.name || "").slice(0, 120),
      (m.image || "").slice(0, 300),
      sender,
      body,
      sender === "goddess" ? 1 : 0, // sender has implicitly "read" their own line
      sender === "user" ? 1 : 0,
      createdAt,
    ],
  );
  return {
    id,
    userId: m.userId,
    username: m.username,
    name: m.name,
    image: m.image,
    sender,
    body,
    createdAt,
  };
}

export async function listThread(userId: string, limit = 400): Promise<Message[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM messages WHERE user_id = ?
     ORDER BY created_at ASC LIMIT ${clampInt(limit, 1, 2000)}`,
    [userId],
  );
  return (rows as any[]).map(rowToMessage);
}

/** Epoch ms of this user's most recent message (optionally by a given side). */
export async function lastMessageAt(
  userId: string,
  sender?: Sender,
): Promise<number> {
  const pool = await db();
  const [rows] = sender
    ? await pool.query(
        `SELECT created_at FROM messages WHERE user_id = ? AND sender = ?
         ORDER BY created_at DESC LIMIT 1`,
        [userId, sender],
      )
    : await pool.query(
        `SELECT created_at FROM messages WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
  const r = (rows as any[])[0];
  return r ? new Date(r.created_at).getTime() : 0;
}

export async function markReadByUser(userId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE messages SET read_user = 1 WHERE user_id = ? AND sender = 'goddess' AND read_user = 0",
    [userId],
  );
}

export async function markReadByAdmin(userId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE messages SET read_admin = 1 WHERE user_id = ? AND sender = 'user' AND read_admin = 0",
    [userId],
  );
}

export async function unreadForUser(userId: string): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT COUNT(*) c FROM messages WHERE user_id = ? AND sender = 'goddess' AND read_user = 0",
    [userId],
  );
  return Number((rows as any[])[0]?.c) || 0;
}

export async function totalUnread(): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT COUNT(*) c FROM messages WHERE sender = 'user' AND read_admin = 0",
  );
  return Number((rows as any[])[0]?.c) || 0;
}

export async function listConversations(limit = 400): Promise<Conversation[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT user_id,
            MAX(username) username, MAX(name) name, MAX(image) image,
            MAX(created_at) last_at,
            SUM(CASE WHEN sender='user' AND read_admin=0 THEN 1 ELSE 0 END) unread,
            COUNT(*) total
     FROM messages
     GROUP BY user_id
     ORDER BY last_at DESC
     LIMIT ${clampInt(limit, 1, 2000)}`,
  );
  const convos = rows as any[];
  if (!convos.length) return [];

  // Latest message body/sender for each conversation (ISO timestamps sort
  // lexically, so MAX(created_at) is the newest line).
  const [lastRows] = await pool.query(
    `SELECT m.user_id, m.body, m.sender FROM messages m
     JOIN (SELECT user_id, MAX(created_at) c FROM messages GROUP BY user_id) x
       ON m.user_id = x.user_id AND m.created_at = x.c`,
  );
  const lastMap = new Map<string, any>();
  for (const r of lastRows as any[]) {
    if (!lastMap.has(r.user_id)) lastMap.set(r.user_id, r);
  }

  return convos.map((c) => {
    const last = lastMap.get(c.user_id);
    return {
      userId: c.user_id,
      username: c.username || "",
      name: c.name || "",
      image: c.image || "",
      lastBody: last?.body || "",
      lastSender: last?.sender === "goddess" ? "goddess" : "user",
      lastAt: c.last_at || "",
      unread: Number(c.unread) || 0,
      total: Number(c.total) || 0,
    };
  });
}
