import "server-only";
import mysql from "mysql2/promise";

/**
 * MySQL/MariaDB connection pool that provisions itself: on first use it creates
 * the database (if the user may) and all tables, so a fresh server (e.g. the
 * Linux + Cloudflare-tunnel box) needs no manual SQL. Configure via env:
 *   MYSQL_HOST (default 127.0.0.1), MYSQL_PORT (3306),
 *   MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (default gp)
 */

const HOST = process.env.MYSQL_HOST || "127.0.0.1";
const PORT = Number(process.env.MYSQL_PORT || 3306);
const USER = process.env.MYSQL_USER || "root";
const PASSWORD = process.env.MYSQL_PASSWORD || "";
const DATABASE = process.env.MYSQL_DATABASE || "gp";

if (!/^[A-Za-z0-9_]+$/.test(DATABASE)) {
  throw new Error(`Invalid MYSQL_DATABASE name: "${DATABASE}"`);
}

let poolPromise: Promise<mysql.Pool> | null = null;

async function ensureSchema(pool: mysql.Pool): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS profiles (
    slug VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) NOT NULL DEFAULT '',
    twitter VARCHAR(40) NOT NULL DEFAULT '',
    thumbnail VARCHAR(255) NOT NULL DEFAULT '',
    info TEXT,
    gallery LONGTEXT,
    consent_on_file TINYINT(1) NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    INDEX (created_at)
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS visits (
    id CHAR(36) PRIMARY KEY,
    ts VARCHAR(40) NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    ua VARCHAR(300) NOT NULL DEFAULT '',
    path VARCHAR(200) NOT NULL DEFAULT '',
    referer VARCHAR(300) NOT NULL DEFAULT '',
    browser VARCHAR(60) NOT NULL DEFAULT '',
    os VARCHAR(40) NOT NULL DEFAULT '',
    device VARCHAR(20) NOT NULL DEFAULT '',
    lang VARCHAR(40) NOT NULL DEFAULT '',
    tz VARCHAR(60) NOT NULL DEFAULT '',
    screen VARCHAR(20) NOT NULL DEFAULT '',
    viewport VARCHAR(20) NOT NULL DEFAULT '',
    platform VARCHAR(60) NOT NULL DEFAULT '',
    dpr VARCHAR(10) NOT NULL DEFAULT '',
    cores VARCHAR(10) NOT NULL DEFAULT '',
    memory VARCHAR(10) NOT NULL DEFAULT '',
    connection VARCHAR(20) NOT NULL DEFAULT '',
    touch VARCHAR(6) NOT NULL DEFAULT '',
    country VARCHAR(8) NOT NULL DEFAULT '',
    city VARCHAR(80) NOT NULL DEFAULT '',
    region VARCHAR(80) NOT NULL DEFAULT '',
    gpu VARCHAR(160) NOT NULL DEFAULT '',
    fp VARCHAR(32) NOT NULL DEFAULT '',
    langs VARCHAR(120) NOT NULL DEFAULT '',
    color_depth VARCHAR(8) NOT NULL DEFAULT '',
    orientation VARCHAR(24) NOT NULL DEFAULT '',
    dnt VARCHAR(8) NOT NULL DEFAULT '',
    cookies VARCHAR(4) NOT NULL DEFAULT '',
    net_info VARCHAR(60) NOT NULL DEFAULT '',
    max_touch VARCHAR(6) NOT NULL DEFAULT '',
    ua_full VARCHAR(160) NOT NULL DEFAULT '',
    storage_quota VARCHAR(12) NOT NULL DEFAULT '',
    INDEX (ts), INDEX (ip), INDEX (path)
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS logins (
    id CHAR(36) PRIMARY KEY,
    ts VARCHAR(40) NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    ua VARCHAR(300) NOT NULL DEFAULT '',
    twitter_id VARCHAR(40) NOT NULL DEFAULT '',
    twitter_username VARCHAR(40) NOT NULL DEFAULT '',
    twitter_name VARCHAR(255) NOT NULL DEFAULT '',
    allowed TINYINT(1) NOT NULL DEFAULT 0,
    twitter_image VARCHAR(300) NOT NULL DEFAULT '',
    twitter_bio VARCHAR(500) NOT NULL DEFAULT '',
    twitter_location VARCHAR(160) NOT NULL DEFAULT '',
    twitter_url VARCHAR(300) NOT NULL DEFAULT '',
    twitter_verified TINYINT(1) NOT NULL DEFAULT 0,
    twitter_created VARCHAR(40) NOT NULL DEFAULT '',
    followers INT NOT NULL DEFAULT 0,
    following INT NOT NULL DEFAULT 0,
    tweets INT NOT NULL DEFAULT 0,
    INDEX (ts), INDEX (ip), INDEX (twitter_username)
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    id TINYINT PRIMARY KEY,
    data LONGTEXT
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS game_rolls (
    id CHAR(36) PRIMARY KEY,
    ts VARCHAR(40) NOT NULL,
    game VARCHAR(16) NOT NULL DEFAULT '',
    user_id VARCHAR(40) NOT NULL DEFAULT '',
    username VARCHAR(40) NOT NULL DEFAULT '',
    name VARCHAR(120) NOT NULL DEFAULT '',
    result VARCHAR(160) NOT NULL DEFAULT '',
    rigged TINYINT(1) NOT NULL DEFAULT 0,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    INDEX (ts), INDEX (game), INDEX (username)
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS game_rigs (
    user_id VARCHAR(40) PRIMARY KEY,
    username VARCHAR(40) NOT NULL DEFAULT '',
    result VARCHAR(160) NOT NULL DEFAULT '',
    remaining INT NOT NULL DEFAULT 0,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB`);

  await ensureColumns(pool);
}

// Columns added after the tables first shipped. Existing databases (with data
// already in them) gain these on startup. Definitions are also present in the
// CREATE TABLE blocks above, so fresh installs never need the migration.
const ADDED_COLUMNS: Record<string, Record<string, string>> = {
  visits: {
    dpr: "VARCHAR(10) NOT NULL DEFAULT ''",
    cores: "VARCHAR(10) NOT NULL DEFAULT ''",
    memory: "VARCHAR(10) NOT NULL DEFAULT ''",
    connection: "VARCHAR(20) NOT NULL DEFAULT ''",
    touch: "VARCHAR(6) NOT NULL DEFAULT ''",
    country: "VARCHAR(8) NOT NULL DEFAULT ''",
    city: "VARCHAR(80) NOT NULL DEFAULT ''",
    region: "VARCHAR(80) NOT NULL DEFAULT ''",
    gpu: "VARCHAR(160) NOT NULL DEFAULT ''",
    fp: "VARCHAR(32) NOT NULL DEFAULT ''",
    langs: "VARCHAR(120) NOT NULL DEFAULT ''",
    color_depth: "VARCHAR(8) NOT NULL DEFAULT ''",
    orientation: "VARCHAR(24) NOT NULL DEFAULT ''",
    dnt: "VARCHAR(8) NOT NULL DEFAULT ''",
    cookies: "VARCHAR(4) NOT NULL DEFAULT ''",
    net_info: "VARCHAR(60) NOT NULL DEFAULT ''",
    max_touch: "VARCHAR(6) NOT NULL DEFAULT ''",
    ua_full: "VARCHAR(160) NOT NULL DEFAULT ''",
    storage_quota: "VARCHAR(12) NOT NULL DEFAULT ''",
  },
  logins: {
    twitter_image: "VARCHAR(300) NOT NULL DEFAULT ''",
    twitter_bio: "VARCHAR(500) NOT NULL DEFAULT ''",
    twitter_location: "VARCHAR(160) NOT NULL DEFAULT ''",
    twitter_url: "VARCHAR(300) NOT NULL DEFAULT ''",
    twitter_verified: "TINYINT(1) NOT NULL DEFAULT 0",
    twitter_created: "VARCHAR(40) NOT NULL DEFAULT ''",
    followers: "INT NOT NULL DEFAULT 0",
    following: "INT NOT NULL DEFAULT 0",
    tweets: "INT NOT NULL DEFAULT 0",
  },
};

/**
 * Idempotently add any missing columns. We look up the existing columns from
 * information_schema first and only issue a plain `ADD COLUMN` for the gaps —
 * portable across MariaDB AND MySQL 8 (which rejects `ADD COLUMN IF NOT EXISTS`).
 */
async function ensureColumns(pool: mysql.Pool): Promise<void> {
  for (const [table, cols] of Object.entries(ADDED_COLUMNS)) {
    let existing = new Set<string>();
    try {
      const [rows] = await pool.query(
        `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [DATABASE, table],
      );
      existing = new Set(
        (rows as { name: string }[]).map((r) => r.name.toLowerCase()),
      );
    } catch (e) {
      console.warn("[db] could not read schema for", table, (e as Error).message);
      continue;
    }
    for (const [col, def] of Object.entries(cols)) {
      if (existing.has(col.toLowerCase())) continue;
      try {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      } catch (e) {
        console.warn("[db] add column skipped:", table, col, (e as Error).message);
      }
    }
  }
}

async function provision(): Promise<mysql.Pool> {
  // Best-effort: create the database if the configured user is allowed to.
  try {
    const conn = await mysql.createConnection({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASSWORD,
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.end();
  } catch (e) {
    // Limited user / db already exists — continue and assume it's there.
    console.warn(
      "[db] could not auto-create database (continuing):",
      (e as Error).message,
    );
  }

  const pool = mysql.createPool({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });
  await ensureSchema(pool);
  return pool;
}

/** Shared pool, provisioned once per process. */
export function db(): Promise<mysql.Pool> {
  if (!poolPromise) {
    poolPromise = provision().catch((e) => {
      poolPromise = null; // allow retry on next call
      throw e;
    });
  }
  return poolPromise;
}
