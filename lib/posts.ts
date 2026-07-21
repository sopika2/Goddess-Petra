import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The home timeline — the goddess's own posts, Twitter-style but one-way. A
// post is text + an optional picture/video + an optional link button. If it has
// 2+ poll options it renders as a poll; signed-in X visitors vote once each.
// Posts can be composed from scratch (Admin → Board) or pulled straight out of
// a DM (the inbox "→ board" action reuses createPost with the message's body +
// media).

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  body: string;
  mediaUrl: string;
  linkLabel: string;
  linkUrl: string;
  pinned: boolean;
  createdAt: string;
  poll: PollOption[] | null; // null when it's not a poll
  totalVotes: number;
  myVote: string | null; // option id the current viewer voted for
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

/** http(s) only, so a link button can't carry javascript:/data: URLs. */
function safeUrl(url: string): string {
  const v = (url || "").trim();
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? v.slice(0, 300) : "";
  } catch {
    return "";
  }
}

export async function createPost(p: {
  body: string;
  mediaUrl?: string;
  linkLabel?: string;
  linkUrl?: string;
  pollOptions?: string[];
}): Promise<string> {
  const pool = await db();
  const id = crypto.randomUUID();
  const linkUrl = safeUrl(p.linkUrl || "");
  await pool.query(
    `INSERT INTO posts (id, body, media_url, link_label, link_url, pinned, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      (p.body || "").slice(0, 2000),
      (p.mediaUrl || "").slice(0, 300),
      linkUrl ? (p.linkLabel || "open ▸").slice(0, 80) : "",
      linkUrl,
      new Date().toISOString(),
    ],
  );

  const opts = (p.pollOptions || [])
    .map((o) => String(o).trim())
    .filter(Boolean)
    .slice(0, 6);
  if (opts.length >= 2) {
    for (let i = 0; i < opts.length; i++) {
      await pool.query(
        `INSERT INTO poll_options (id, post_id, label, sort) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), id, opts[i].slice(0, 120), i],
      );
    }
  }
  return id;
}

export async function deletePost(id: string): Promise<void> {
  const pool = await db();
  await pool.query("DELETE FROM posts WHERE id = ?", [id]);
  await pool.query("DELETE FROM poll_options WHERE post_id = ?", [id]);
  await pool.query("DELETE FROM poll_votes WHERE post_id = ?", [id]);
}

/** Pin one post to the top (a single standing announcement) or unpin it. */
export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const pool = await db();
  if (pinned) {
    await pool.query("UPDATE posts SET pinned = 0 WHERE pinned = 1");
  }
  await pool.query("UPDATE posts SET pinned = ? WHERE id = ?", [pinned ? 1 : 0, id]);
}

export async function listPosts(
  viewerId?: string,
  limit = 60,
): Promise<Post[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM posts ORDER BY pinned DESC, created_at DESC LIMIT ${clampInt(limit, 1, 200)}`,
  );
  const posts = rows as any[];
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);

  // Poll options + vote tallies for these posts, in one pass each.
  const [optRows] = await pool.query(
    `SELECT o.id, o.post_id, o.label, o.sort, COUNT(v.id) votes
     FROM poll_options o
     LEFT JOIN poll_votes v ON v.option_id = o.id
     WHERE o.post_id IN (${ids.map(() => "?").join(",")})
     GROUP BY o.id ORDER BY o.sort ASC`,
    ids,
  );
  const optsByPost = new Map<string, PollOption[]>();
  for (const o of optRows as any[]) {
    const arr = optsByPost.get(o.post_id) || [];
    arr.push({ id: o.id, label: o.label, votes: Number(o.votes) || 0 });
    optsByPost.set(o.post_id, arr);
  }

  // What the current viewer voted for (if signed in).
  const myVotes = new Map<string, string>();
  if (viewerId) {
    const [vRows] = await pool.query(
      `SELECT post_id, option_id FROM poll_votes
       WHERE user_id = ? AND post_id IN (${ids.map(() => "?").join(",")})`,
      [viewerId, ...ids],
    );
    for (const v of vRows as any[]) myVotes.set(v.post_id, v.option_id);
  }

  return posts.map((p) => {
    const poll = optsByPost.get(p.id) || null;
    const totalVotes = poll ? poll.reduce((n, o) => n + o.votes, 0) : 0;
    return {
      id: p.id,
      body: p.body,
      mediaUrl: p.media_url || "",
      linkLabel: p.link_label || "",
      linkUrl: p.link_url || "",
      pinned: p.pinned === 1,
      createdAt: p.created_at,
      poll: poll && poll.length ? poll : null,
      totalVotes,
      myVote: myVotes.get(p.id) || null,
    };
  });
}

export type VoteResult =
  | { ok: true }
  | { ok: false; reason: "not_a_poll" | "bad_option" };

/** Cast one vote. One per user per poll (the UNIQUE key makes re-votes no-ops,
 *  so the first choice stands — like Twitter). */
export async function vote(
  postId: string,
  optionId: string,
  userId: string,
): Promise<VoteResult> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT id FROM poll_options WHERE id = ? AND post_id = ?",
    [optionId, postId],
  );
  if (!(rows as any[]).length) return { ok: false, reason: "bad_option" };
  await pool.query(
    `INSERT IGNORE INTO poll_votes (id, post_id, option_id, user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), postId, optionId, userId.slice(0, 40), new Date().toISOString()],
  );
  return { ok: true };
}
