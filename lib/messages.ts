import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Two-way DMs between a signed-in X visitor and the admin ("goddess").
// A conversation is simply all rows sharing a user_id. read_admin / read_user
// track unread state for each side. Messages can carry a picture/video
// (media_url) and the goddess can send a "tribute" sticker — a card that
// links the sub to her Throne (link column, falls back to the settings URL).

export type Sender = "user" | "goddess";
export type MessageKind = "text" | "tribute";

export interface Message {
  id: string;
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: Sender;
  body: string;
  createdAt: string;
  mediaUrl: string;
  kind: MessageKind;
  link: string;
  readAdmin: boolean;
  readUser: boolean;
}

/** What the visitor's browser gets — no identity snapshots, no read_admin
 *  internals beyond their own receipt. */
export interface VisitorMessage {
  id: string;
  sender: Sender;
  body: string;
  createdAt: string;
  mediaUrl: string;
  kind: MessageKind;
  link: string;
  readByGoddess: boolean;
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
  pinned: boolean;
  blocked: boolean;
}

export interface ChatFlags {
  userId: string;
  pinned: boolean;
  blocked: boolean;
  note: string;
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
    mediaUrl: r.media_url || "",
    kind: r.kind === "tribute" ? "tribute" : "text",
    link: r.link || "",
    readAdmin: r.read_admin === 1,
    readUser: r.read_user === 1,
  };
}

export function toVisitorMessage(m: Message): VisitorMessage {
  return {
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt,
    mediaUrl: m.mediaUrl,
    kind: m.kind,
    link: m.link,
    readByGoddess: m.sender === "user" ? m.readAdmin : true,
  };
}

async function insertMessage(m: Message): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO messages
       (id, user_id, username, name, image, sender, body, read_admin, read_user,
        created_at, media_url, kind, link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id,
      (m.userId || "").slice(0, 40),
      (m.username || "").slice(0, 40),
      (m.name || "").slice(0, 120),
      (m.image || "").slice(0, 300),
      m.sender,
      (m.body || "").slice(0, 2000),
      m.sender === "goddess" ? 1 : 0, // sender has implicitly "read" their own line
      m.sender === "user" ? 1 : 0,
      m.createdAt,
      (m.mediaUrl || "").slice(0, 300),
      m.kind,
      (m.link || "").slice(0, 300),
    ],
  );
}

/** Identity snapshot for a conversation — from its newest row. This is what
 *  goddess replies use, so the client can never spoof who a thread belongs to. */
export async function getThreadIdentity(
  userId: string,
): Promise<{ username: string; name: string; image: string } | null> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT username, name, image FROM messages WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  const r = (rows as any[])[0];
  return r ? { username: r.username, name: r.name, image: r.image } : null;
}

/** Visitor send — plain text plus an optional picture. */
export async function sendUserMessage(m: {
  userId: string;
  username: string;
  name: string;
  image: string;
  body: string;
  mediaUrl?: string;
}): Promise<Message> {
  const message: Message = {
    id: crypto.randomUUID(),
    userId: m.userId,
    username: m.username,
    name: m.name,
    image: m.image,
    sender: "user",
    body: (m.body || "").slice(0, 2000),
    createdAt: new Date().toISOString(),
    mediaUrl: (m.mediaUrl || "").slice(0, 300),
    kind: "text",
    link: "",
    readAdmin: false,
    readUser: true,
  };
  await insertMessage(message);
  return message;
}

/**
 * Goddess reply. Identity is derived from the thread (never client input);
 * returns null when no conversation exists for that userId. kind "tribute"
 * renders as a pay-me sticker in the sub's chat, linking to `link`.
 */
export async function sendGoddessMessage(m: {
  userId: string;
  body: string;
  mediaUrl?: string;
  kind?: MessageKind;
  link?: string;
}): Promise<Message | null> {
  const identity = await getThreadIdentity(m.userId);
  if (!identity) return null;
  const kind: MessageKind = m.kind === "tribute" ? "tribute" : "text";
  const message: Message = {
    id: crypto.randomUUID(),
    userId: m.userId,
    username: identity.username,
    name: identity.name,
    image: identity.image,
    sender: "goddess",
    body: (m.body || "").slice(0, 2000),
    createdAt: new Date().toISOString(),
    mediaUrl: (m.mediaUrl || "").slice(0, 300),
    kind,
    link: kind === "tribute" ? (m.link || "").slice(0, 300) : "",
    readAdmin: true,
    readUser: false,
  };
  await insertMessage(message);
  return message;
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

export async function getFlags(userId: string): Promise<ChatFlags> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM chat_flags WHERE user_id = ?",
    [userId],
  );
  const r = (rows as any[])[0];
  return {
    userId,
    pinned: r ? r.pinned === 1 : false,
    blocked: r ? r.blocked === 1 : false,
    note: r ? r.note : "",
  };
}

export async function setFlags(
  userId: string,
  patch: Partial<Omit<ChatFlags, "userId">>,
): Promise<ChatFlags> {
  const current = await getFlags(userId);
  const next: ChatFlags = {
    userId: (userId || "").slice(0, 40),
    pinned: patch.pinned ?? current.pinned,
    blocked: patch.blocked ?? current.blocked,
    note: (patch.note ?? current.note).slice(0, 500),
  };
  const pool = await db();
  await pool.query(
    `INSERT INTO chat_flags (user_id, pinned, blocked, note, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       pinned = VALUES(pinned), blocked = VALUES(blocked),
       note = VALUES(note), updated_at = VALUES(updated_at)`,
    [
      next.userId,
      next.pinned ? 1 : 0,
      next.blocked ? 1 : 0,
      next.note,
      new Date().toISOString(),
    ],
  );
  return next;
}

export async function listConversations(limit = 400): Promise<Conversation[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT m.user_id,
            MAX(m.username) username, MAX(m.name) name, MAX(m.image) image,
            MAX(m.created_at) last_at,
            SUM(CASE WHEN m.sender='user' AND m.read_admin=0 THEN 1 ELSE 0 END) unread,
            COUNT(*) total,
            MAX(COALESCE(f.pinned, 0)) pinned,
            MAX(COALESCE(f.blocked, 0)) blocked
     FROM messages m
     LEFT JOIN chat_flags f ON f.user_id = m.user_id
     GROUP BY m.user_id
     ORDER BY pinned DESC, last_at DESC
     LIMIT ${clampInt(limit, 1, 2000)}`,
  );
  const convos = rows as any[];
  if (!convos.length) return [];

  // Latest message body/sender for each conversation (ISO timestamps sort
  // lexically, so MAX(created_at) is the newest line).
  const [lastRows] = await pool.query(
    `SELECT m.user_id, m.body, m.sender, m.media_url, m.kind FROM messages m
     JOIN (SELECT user_id, MAX(created_at) c FROM messages GROUP BY user_id) x
       ON m.user_id = x.user_id AND m.created_at = x.c`,
  );
  const lastMap = new Map<string, any>();
  for (const r of lastRows as any[]) {
    if (!lastMap.has(r.user_id)) lastMap.set(r.user_id, r);
  }

  return convos.map((c) => {
    const last = lastMap.get(c.user_id);
    const lastBody =
      last?.body ||
      (last?.kind === "tribute"
        ? "♛ tribute demanded"
        : last?.media_url
          ? "· attachment ·"
          : "");
    return {
      userId: c.user_id,
      username: c.username || "",
      name: c.name || "",
      image: c.image || "",
      lastBody,
      lastSender: last?.sender === "goddess" ? "goddess" : "user",
      lastAt: c.last_at || "",
      unread: Number(c.unread) || 0,
      total: Number(c.total) || 0,
      pinned: Number(c.pinned) === 1,
      blocked: Number(c.blocked) === 1,
    };
  });
}
