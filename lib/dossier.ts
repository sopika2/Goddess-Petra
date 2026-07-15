import "server-only";
import { db } from "./database";
import { getFlags, type ChatFlags } from "./messages";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Everything the goddess knows about one sub, joined by their X id — shown in
// the inbox side panel so she can size a loser up without leaving the thread.

export interface DossierLogin {
  username: string;
  name: string;
  image: string;
  bio: string;
  location: string;
  verified: boolean;
  accountCreated: string;
  followers: number;
  following: number;
  tweets: number;
  lastIp: string;
  lastSeen: string;
}

export interface Dossier {
  login: DossierLogin | null;
  loginCount: number;
  distinctIps: number;
  firstSeen: string;
  spins: number;
  lastSpinResult: string;
  confessions: number;
  flags: ChatFlags;
}

export async function getDossier(userId: string): Promise<Dossier> {
  const pool = await db();

  const [loginRows] = await pool.query(
    `SELECT * FROM logins WHERE twitter_id = ? ORDER BY ts DESC LIMIT 1`,
    [userId],
  );
  const l = (loginRows as any[])[0];
  const login: DossierLogin | null = l
    ? {
        username: l.twitter_username,
        name: l.twitter_name,
        image: l.twitter_image,
        bio: l.twitter_bio,
        location: l.twitter_location,
        verified: l.twitter_verified === 1,
        accountCreated: l.twitter_created,
        followers: Number(l.followers) || 0,
        following: Number(l.following) || 0,
        tweets: Number(l.tweets) || 0,
        lastIp: l.ip,
        lastSeen: l.ts,
      }
    : null;

  const [statRows] = await pool.query(
    `SELECT COUNT(*) c, COUNT(DISTINCT ip) ips, MIN(ts) first_ts
     FROM logins WHERE twitter_id = ?`,
    [userId],
  );
  const stat = (statRows as any[])[0] || {};

  const [spinRows] = await pool.query(
    `SELECT COUNT(*) c FROM game_rolls WHERE user_id = ?`,
    [userId],
  );
  const [lastSpinRows] = await pool.query(
    `SELECT result FROM game_rolls WHERE user_id = ? ORDER BY ts DESC LIMIT 1`,
    [userId],
  );
  const [confRows] = await pool.query(
    `SELECT COUNT(*) c FROM confessions WHERE user_id = ?`,
    [userId],
  );

  return {
    login,
    loginCount: Number(stat.c) || 0,
    distinctIps: Number(stat.ips) || 0,
    firstSeen: stat.first_ts || "",
    spins: Number((spinRows as any[])[0]?.c) || 0,
    lastSpinResult: (lastSpinRows as any[])[0]?.result || "",
    confessions: Number((confRows as any[])[0]?.c) || 0,
    flags: await getFlags(userId),
  };
}
