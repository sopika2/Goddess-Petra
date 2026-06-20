import "server-only";
import crypto from "node:crypto";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Visit {
  id: string;
  ts: string;
  ip: string;
  ua: string;
  path: string;
  referer: string;
  browser?: string;
  os?: string;
  device?: string;
  lang?: string;
  tz?: string;
  screen?: string;
  viewport?: string;
  platform?: string;
  /** Device pixel ratio (retina detection). */
  dpr?: string;
  /** Logical CPU cores (navigator.hardwareConcurrency). */
  cores?: string;
  /** Approx device RAM in GB (navigator.deviceMemory). */
  memory?: string;
  /** Network type, e.g. "4g" (navigator.connection.effectiveType). */
  connection?: string;
  /** "yes"/"no" — touch screen present. */
  touch?: string;
  /** Country / city / region from Cloudflare's visitor-location headers. */
  country?: string;
  city?: string;
  region?: string;
  /** GPU model (WebGL UNMASKED_RENDERER) — quite identifying. */
  gpu?: string;
  /** Composite device fingerprint hash — same device/browser ⇒ same value. */
  fp?: string;
  /** Full language preference list (navigator.languages). */
  langs?: string;
  /** Screen color depth in bits. */
  colorDepth?: string;
  /** Screen orientation, e.g. "landscape-primary". */
  orientation?: string;
  /** Do Not Track signal. */
  dnt?: string;
  /** "yes"/"no" — cookies enabled. */
  cookies?: string;
  /** Network detail: downlink / round-trip / data-saver. */
  netInfo?: string;
  /** Touch points supported (0 = none). */
  maxTouch?: string;
  /** High-entropy UA: device model · OS version · CPU arch. */
  uaFull?: string;
  /** Approx storage quota (GB). */
  storage?: string;
}

export interface LoginEvent {
  id: string;
  ts: string;
  ip: string;
  ua: string;
  twitterId: string;
  twitterUsername: string;
  twitterName: string;
  allowed: boolean;
  image?: string;
  bio?: string;
  location?: string;
  url?: string;
  verified?: boolean;
  accountCreated?: string;
  followers?: number;
  following?: number;
  tweets?: number;
}

/** Lightweight, dependency-free user-agent parse → browser / os / device. */
export function parseUa(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  const u = ua || "";
  let browser = "Unknown";
  if (/Edg\//.test(u)) browser = "Edge";
  else if (/OPR\/|Opera/.test(u)) browser = "Opera";
  else if (/Firefox\/\d/.test(u)) browser = "Firefox";
  else if (/Chrome\/\d/.test(u) && !/Chromium/.test(u)) browser = "Chrome";
  else if (/Version\/\d.*Safari/.test(u)) browser = "Safari";
  else if (/Chromium/.test(u)) browser = "Chromium";
  else if (/curl\//i.test(u)) browser = "curl";
  const ver = u.match(/(?:Edg|OPR|Firefox|Chrome|Version)\/(\d+)/);
  if (ver && browser !== "Unknown" && browser !== "curl")
    browser += " " + ver[1];

  let os = "Unknown";
  if (/Windows/.test(u)) os = "Windows";
  else if (/Android/.test(u)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(u)) os = "iOS";
  else if (/Mac OS X/.test(u)) os = "macOS";
  else if (/Linux/.test(u)) os = "Linux";

  const device = /Mobi|Android|iPhone|iPod/.test(u)
    ? "Mobile"
    : /iPad|Tablet/.test(u)
      ? "Tablet"
      : "Desktop";
  return { browser, os, device };
}

function rowToVisit(r: any): Visit {
  return {
    id: r.id,
    ts: r.ts,
    ip: r.ip,
    ua: r.ua,
    path: r.path,
    referer: r.referer,
    browser: r.browser,
    os: r.os,
    device: r.device,
    lang: r.lang,
    tz: r.tz,
    screen: r.screen,
    viewport: r.viewport,
    platform: r.platform,
    dpr: r.dpr,
    cores: r.cores,
    memory: r.memory,
    connection: r.connection,
    touch: r.touch,
    country: r.country,
    city: r.city,
    region: r.region,
    gpu: r.gpu,
    fp: r.fp,
    langs: r.langs,
    colorDepth: r.color_depth,
    orientation: r.orientation,
    dnt: r.dnt,
    cookies: r.cookies,
    netInfo: r.net_info,
    maxTouch: r.max_touch,
    uaFull: r.ua_full,
    storage: r.storage_quota,
  };
}
function rowToLogin(r: any): LoginEvent {
  return {
    id: r.id,
    ts: r.ts,
    ip: r.ip,
    ua: r.ua,
    twitterId: r.twitter_id,
    twitterUsername: r.twitter_username,
    twitterName: r.twitter_name,
    allowed: r.allowed === 1,
    image: r.twitter_image,
    bio: r.twitter_bio,
    location: r.twitter_location,
    url: r.twitter_url,
    verified: r.twitter_verified === 1,
    accountCreated: r.twitter_created,
    followers: r.followers,
    following: r.following,
    tweets: r.tweets,
  };
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

// ── writes ──────────────────────────────────────────────────────────────
export async function logVisit(v: Omit<Visit, "id" | "ts">): Promise<void> {
  const pool = await db();
  const s = (x: unknown, n: number) =>
    typeof x === "string" ? x.slice(0, n) : "";
  await pool.query(
    `INSERT INTO visits
      (id, ts, ip, ua, path, referer, browser, os, device, lang, tz, screen, viewport, platform,
       dpr, cores, memory, connection, touch,
       country, city, region, gpu, fp, langs, color_depth, orientation, dnt, cookies,
       net_info, max_touch, ua_full, storage_quota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      new Date().toISOString(),
      v.ip,
      v.ua,
      v.path,
      v.referer,
      v.browser || "",
      v.os || "",
      v.device || "",
      v.lang || "",
      v.tz || "",
      v.screen || "",
      v.viewport || "",
      v.platform || "",
      v.dpr || "",
      v.cores || "",
      v.memory || "",
      v.connection || "",
      v.touch || "",
      s(v.country, 8),
      s(v.city, 80),
      s(v.region, 80),
      s(v.gpu, 160),
      s(v.fp, 32),
      s(v.langs, 120),
      s(v.colorDepth, 8),
      s(v.orientation, 24),
      s(v.dnt, 8),
      s(v.cookies, 4),
      s(v.netInfo, 60),
      s(v.maxTouch, 6),
      s(v.uaFull, 160),
      s(v.storage, 12),
    ],
  );
}

export async function logLogin(e: Omit<LoginEvent, "id" | "ts">): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO logins
      (id, ts, ip, ua, twitter_id, twitter_username, twitter_name, allowed,
       twitter_image, twitter_bio, twitter_location, twitter_url, twitter_verified,
       twitter_created, followers, following, tweets)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      new Date().toISOString(),
      e.ip,
      e.ua,
      (e.twitterId || "").slice(0, 40),
      (e.twitterUsername || "").slice(0, 40),
      (e.twitterName || "").slice(0, 255),
      e.allowed ? 1 : 0,
      (e.image || "").slice(0, 300),
      (e.bio || "").slice(0, 500),
      (e.location || "").slice(0, 160),
      (e.url || "").slice(0, 300),
      e.verified ? 1 : 0,
      (e.accountCreated || "").slice(0, 40),
      e.followers ?? 0,
      e.following ?? 0,
      e.tweets ?? 0,
    ],
  );
}

// ── reads ───────────────────────────────────────────────────────────────
export async function listVisits(limit = 200): Promise<Visit[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM visits ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
  );
  return (rows as any[]).map(rowToVisit);
}

export async function listLogins(limit = 200): Promise<LoginEvent[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM logins ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
  );
  return (rows as any[]).map(rowToLogin);
}

export async function searchVisits(q: string, limit = 300): Promise<Visit[]> {
  const pool = await db();
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT * FROM visits
     WHERE ip LIKE ? OR path LIKE ? OR browser LIKE ? OR os LIKE ? OR device LIKE ?
        OR lang LIKE ? OR tz LIKE ? OR ua LIKE ? OR referer LIKE ?
        OR country LIKE ? OR city LIKE ? OR region LIKE ? OR gpu LIKE ? OR fp LIKE ?
     ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 2000)}`,
    [like, like, like, like, like, like, like, like, like, like, like, like, like, like],
  );
  return (rows as any[]).map(rowToVisit);
}

export async function searchLogins(q: string, limit = 300): Promise<LoginEvent[]> {
  const pool = await db();
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT * FROM logins
     WHERE twitter_username LIKE ? OR twitter_name LIKE ? OR twitter_id LIKE ? OR ip LIKE ?
     ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 2000)}`,
    [like, like, like, like],
  );
  return (rows as any[]).map(rowToLogin);
}

export async function visitsByIp(ip: string, limit = 2000): Promise<Visit[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM visits WHERE ip = ? ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
    [ip],
  );
  return (rows as any[]).map(rowToVisit);
}

export async function loginsByIp(ip: string, limit = 2000): Promise<LoginEvent[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM logins WHERE ip = ? ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
    [ip],
  );
  return (rows as any[]).map(rowToLogin);
}

export async function loginsByHandle(
  handle: string,
  limit = 2000,
): Promise<LoginEvent[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM logins WHERE twitter_username = ? ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
    [handle],
  );
  return (rows as any[]).map(rowToLogin);
}

/** Visits coming from any IP that the given handle has logged in from. */
export async function visitsForHandle(
  handle: string,
  limit = 2000,
): Promise<Visit[]> {
  const pool = await db();
  const [ipRows] = await pool.query(
    "SELECT DISTINCT ip FROM logins WHERE twitter_username = ?",
    [handle],
  );
  const ips = (ipRows as any[]).map((r) => r.ip).filter(Boolean);
  if (ips.length === 0) return [];
  const placeholders = ips.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT * FROM visits WHERE ip IN (${placeholders}) ORDER BY ts DESC LIMIT ${clampInt(limit, 1, 5000)}`,
    ips,
  );
  return (rows as any[]).map(rowToVisit);
}

export interface Stats {
  totalVisits: number;
  uniqueIps: number;
  visitsToday: number;
  totalLogins: number;
  uniqueLoginUsers: number;
}

export async function stats(): Promise<Stats> {
  const pool = await db();
  const today = new Date().toISOString().slice(0, 10);
  const [v] = await pool.query(
    `SELECT COUNT(*) AS c, COUNT(DISTINCT ip) AS u,
            SUM(CASE WHEN LEFT(ts,10) = ? THEN 1 ELSE 0 END) AS today
     FROM visits`,
    [today],
  );
  const [l] = await pool.query(
    "SELECT COUNT(*) AS c, COUNT(DISTINCT twitter_id) AS u FROM logins",
  );
  const vr = (v as any[])[0];
  const lr = (l as any[])[0];
  return {
    totalVisits: Number(vr.c) || 0,
    uniqueIps: Number(vr.u) || 0,
    visitsToday: Number(vr.today) || 0,
    totalLogins: Number(lr.c) || 0,
    uniqueLoginUsers: Number(lr.u) || 0,
  };
}

// ── analytics aggregates (the Visitors dashboard) ─────────────────────────

/** One row per X account (collapses the repeated login events). */
export interface AccountSummary {
  twitterId: string;
  username: string;
  name: string;
  image: string;
  admin: boolean; // any login was authorized
  logins: number;
  ips: number;
  firstSeen: string;
  lastSeen: string;
}

export async function accountSummaries(limit = 200): Promise<AccountSummary[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT twitter_id,
            MAX(twitter_username) username,
            MAX(twitter_name) name,
            MAX(twitter_image) image,
            MAX(allowed) admin,
            COUNT(*) logins,
            COUNT(DISTINCT ip) ips,
            MIN(ts) first_seen,
            MAX(ts) last_seen
     FROM logins
     WHERE twitter_id <> ''
     GROUP BY twitter_id
     ORDER BY last_seen DESC
     LIMIT ${clampInt(limit, 1, 2000)}`,
  );
  return (rows as any[]).map((r) => ({
    twitterId: r.twitter_id,
    username: r.username || "",
    name: r.name || "",
    image: r.image || "",
    admin: Number(r.admin) === 1,
    logins: Number(r.logins) || 0,
    ips: Number(r.ips) || 0,
    firstSeen: r.first_seen || "",
    lastSeen: r.last_seen || "",
  }));
}

export interface Breakdown {
  label: string;
  count: number;
}

async function group(sql: string): Promise<Breakdown[]> {
  const pool = await db();
  const [rows] = await pool.query(sql);
  return (rows as any[]).map((r) => ({
    label: String(r.label ?? ""),
    count: Number(r.count) || 0,
  }));
}

export const topCountries = (n = 8) =>
  group(
    `SELECT country AS label, COUNT(*) count FROM visits WHERE country <> ''
     GROUP BY country ORDER BY count DESC LIMIT ${clampInt(n, 1, 50)}`,
  );

export const topPages = (n = 8) =>
  group(
    `SELECT path AS label, COUNT(*) count FROM visits WHERE path <> ''
     GROUP BY path ORDER BY count DESC LIMIT ${clampInt(n, 1, 50)}`,
  );

export const deviceSplit = () =>
  group(
    `SELECT device AS label, COUNT(*) count FROM visits WHERE device <> ''
     GROUP BY device ORDER BY count DESC LIMIT 6`,
  );

export const browserFamilies = (n = 6) =>
  group(
    `SELECT SUBSTRING_INDEX(browser, ' ', 1) AS label, COUNT(*) count
     FROM visits WHERE browser <> ''
     GROUP BY label ORDER BY count DESC LIMIT ${clampInt(n, 1, 50)}`,
  );

export interface DayCount {
  day: string;
  count: number;
}

/** Daily visit counts (oldest → newest) for the trend bars. */
export async function visitsByDay(days = 14): Promise<DayCount[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT LEFT(ts, 10) AS day, COUNT(*) count FROM visits
     GROUP BY day ORDER BY day DESC LIMIT ${clampInt(days, 1, 90)}`,
  );
  return (rows as any[])
    .map((r) => ({ day: String(r.day), count: Number(r.count) || 0 }))
    .reverse();
}
