import "server-only";
import { db } from "./database";
import type { Profile, ProfileInput } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseGallery(s: unknown): string[] {
  try {
    const a = JSON.parse(typeof s === "string" ? s : "[]");
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rowToProfile(r: any): Profile {
  return {
    slug: r.slug,
    name: r.name ?? "",
    tagline: r.tagline ?? "",
    twitter: r.twitter ?? "",
    thumbnail: r.thumbnail ?? "",
    info: r.info ?? "",
    gallery: parseGallery(r.gallery),
    consentOnFile: r.consent_on_file === 1,
    hidden: r.hidden === 1,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** All profiles, including hidden — admin only. */
export async function listProfiles(): Promise<Profile[]> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM profiles ORDER BY created_at DESC",
  );
  return (rows as any[]).map(rowToProfile);
}

/** Only visible profiles — for the public wall, sitemap, and detail pages. */
export async function listPublicProfiles(): Promise<Profile[]> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM profiles WHERE hidden = 0 ORDER BY created_at DESC",
  );
  return (rows as any[]).map(rowToProfile);
}

export async function getProfile(slug: string): Promise<Profile | null> {
  const pool = await db();
  const [rows] = await pool.query(
    "SELECT * FROM profiles WHERE slug = ? LIMIT 1",
    [slug],
  );
  const r = (rows as any[])[0];
  return r ? rowToProfile(r) : null;
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  const pool = await db();
  let base = input.slug ? slugify(input.slug) : slugify(input.name);
  if (!base) base = "profile";
  let slug = base;
  let n = 2;
  // Ensure a unique slug.
  while (true) {
    const [rows] = await pool.query(
      "SELECT 1 FROM profiles WHERE slug = ? LIMIT 1",
      [slug],
    );
    if ((rows as any[]).length === 0) break;
    slug = `${base}-${n++}`;
  }
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO profiles
      (slug, name, tagline, twitter, thumbnail, info, gallery, consent_on_file, hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      input.name,
      input.tagline || "",
      input.twitter || "",
      input.thumbnail || "",
      input.info || "",
      JSON.stringify(input.gallery || []),
      input.consentOnFile ? 1 : 0,
      input.hidden ? 1 : 0,
      now,
      now,
    ],
  );
  return { ...input, slug, createdAt: now, updatedAt: now };
}

export async function updateProfile(
  slug: string,
  patch: Partial<ProfileInput>,
): Promise<Profile | null> {
  const current = await getProfile(slug);
  if (!current) return null;
  const next: Profile = {
    ...current,
    ...patch,
    slug: current.slug, // immutable
    updatedAt: new Date().toISOString(),
  };
  const pool = await db();
  await pool.query(
    `UPDATE profiles SET
       name = ?, tagline = ?, twitter = ?, thumbnail = ?, info = ?,
       gallery = ?, consent_on_file = ?, hidden = ?, updated_at = ?
     WHERE slug = ?`,
    [
      next.name,
      next.tagline,
      next.twitter,
      next.thumbnail,
      next.info,
      JSON.stringify(next.gallery),
      next.consentOnFile ? 1 : 0,
      next.hidden ? 1 : 0,
      next.updatedAt,
      slug,
    ],
  );
  return next;
}

export async function deleteProfile(slug: string): Promise<boolean> {
  const pool = await db();
  const [res] = await pool.query("DELETE FROM profiles WHERE slug = ?", [slug]);
  return (res as any).affectedRows > 0;
}
