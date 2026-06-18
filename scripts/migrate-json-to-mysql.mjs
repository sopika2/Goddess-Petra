// One-off migration: import existing data/*.json into MariaDB/MySQL.
// Safe to re-run (idempotent inserts). Reads connection from .env.local.
//   node scripts/migrate-json-to-mysql.mjs
import { promises as fs } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();

async function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = await fs.readFile(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2];
    }
  } catch {
    /* no .env.local */
  }
  return env;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(root, "data", file), "utf8"));
  } catch {
    return null;
  }
}

const env = await loadEnv();
const DB = env.MYSQL_DATABASE || "gp";
const conn = await mysql.createConnection({
  host: env.MYSQL_HOST || "127.0.0.1",
  port: Number(env.MYSQL_PORT || 3306),
  user: env.MYSQL_USER || "root",
  password: env.MYSQL_PASSWORD || "",
  multipleStatements: true,
});
await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
);
await conn.query(`USE \`${DB}\``);
await conn.query(`CREATE TABLE IF NOT EXISTS profiles (slug VARCHAR(80) PRIMARY KEY, name VARCHAR(255) NOT NULL, tagline VARCHAR(255) NOT NULL DEFAULT '', twitter VARCHAR(40) NOT NULL DEFAULT '', thumbnail VARCHAR(255) NOT NULL DEFAULT '', info TEXT, gallery LONGTEXT, consent_on_file TINYINT(1) NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL, INDEX (created_at)) ENGINE=InnoDB`);
await conn.query(`CREATE TABLE IF NOT EXISTS visits (id CHAR(36) PRIMARY KEY, ts VARCHAR(40) NOT NULL, ip VARCHAR(64) NOT NULL DEFAULT '', ua VARCHAR(300) NOT NULL DEFAULT '', path VARCHAR(200) NOT NULL DEFAULT '', referer VARCHAR(300) NOT NULL DEFAULT '', browser VARCHAR(60) NOT NULL DEFAULT '', os VARCHAR(40) NOT NULL DEFAULT '', device VARCHAR(20) NOT NULL DEFAULT '', lang VARCHAR(40) NOT NULL DEFAULT '', tz VARCHAR(60) NOT NULL DEFAULT '', screen VARCHAR(20) NOT NULL DEFAULT '', viewport VARCHAR(20) NOT NULL DEFAULT '', platform VARCHAR(60) NOT NULL DEFAULT '', INDEX (ts), INDEX (ip), INDEX (path)) ENGINE=InnoDB`);
await conn.query(`CREATE TABLE IF NOT EXISTS logins (id CHAR(36) PRIMARY KEY, ts VARCHAR(40) NOT NULL, ip VARCHAR(64) NOT NULL DEFAULT '', ua VARCHAR(300) NOT NULL DEFAULT '', twitter_id VARCHAR(40) NOT NULL DEFAULT '', twitter_username VARCHAR(40) NOT NULL DEFAULT '', twitter_name VARCHAR(255) NOT NULL DEFAULT '', allowed TINYINT(1) NOT NULL DEFAULT 0, INDEX (ts), INDEX (ip), INDEX (twitter_username)) ENGINE=InnoDB`);
await conn.query(`CREATE TABLE IF NOT EXISTS settings (id TINYINT PRIMARY KEY, data LONGTEXT) ENGINE=InnoDB`);

let counts = { profiles: 0, visits: 0, logins: 0, settings: 0 };

const profiles = await readJson("profiles.json");
if (Array.isArray(profiles)) {
  for (const p of profiles) {
    await conn.query(
      `INSERT IGNORE INTO profiles (slug,name,tagline,twitter,thumbnail,info,gallery,consent_on_file,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        p.slug,
        p.name || "",
        p.tagline || "",
        p.twitter || "",
        p.thumbnail || "",
        p.info || "",
        JSON.stringify(p.gallery || []),
        p.consentOnFile ? 1 : 0,
        p.createdAt || new Date().toISOString(),
        p.updatedAt || new Date().toISOString(),
      ],
    );
    counts.profiles++;
  }
}

const visits = await readJson("visits.json");
if (Array.isArray(visits)) {
  for (const v of visits) {
    await conn.query(
      `INSERT IGNORE INTO visits (id,ts,ip,ua,path,referer,browser,os,device,lang,tz,screen,viewport,platform) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [v.id, v.ts, v.ip || "", v.ua || "", v.path || "", v.referer || "", v.browser || "", v.os || "", v.device || "", v.lang || "", v.tz || "", v.screen || "", v.viewport || "", v.platform || ""],
    );
    counts.visits++;
  }
}

const logins = await readJson("logins.json");
if (Array.isArray(logins)) {
  for (const l of logins) {
    await conn.query(
      `INSERT IGNORE INTO logins (id,ts,ip,ua,twitter_id,twitter_username,twitter_name,allowed) VALUES (?,?,?,?,?,?,?,?)`,
      [l.id, l.ts, l.ip || "", l.ua || "", l.twitterId || "", l.twitterUsername || "", l.twitterName || "", l.allowed ? 1 : 0],
    );
    counts.logins++;
  }
}

const settings = await readJson("settings.json");
if (settings && typeof settings === "object") {
  await conn.query(
    `INSERT INTO settings (id,data) VALUES (1,?) ON DUPLICATE KEY UPDATE data=VALUES(data)`,
    [JSON.stringify(settings)],
  );
  counts.settings = 1;
}

await conn.end();
console.log("migrated:", counts);
