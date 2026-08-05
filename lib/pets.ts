import "server-only";
import { db } from "./database";
import { petDisplayName, petNameMatches } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

// "Pets" — visitors who rebrand their X account as hers. Claiming assigns a
// permanent sequential number (the AUTO_INCREMENT primary key), which they're
// told to put in their X display name.
//
// NOTE: X's API has no endpoint to change someone's display name (that lives in
// the retired v1.1 account/update_profile, unavailable on the current tiers), so
// the rename is done BY the pet in X's own settings. We verify it instead: on
// every X sign-in we compare their live display name against the expected one
// and flip the `verified` flag. Honest, and it can't be faked.

export interface Pet {
  number: number;
  userId: string;
  username: string;
  name: string;
  image: string;
  verified: boolean;
  claimedAt: string;
  verifiedAt: string;
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

function rowToPet(r: any): Pet {
  return {
    number: Number(r.number) || 0,
    userId: r.user_id,
    username: r.username,
    name: r.name,
    image: r.image,
    verified: r.verified === 1,
    claimedAt: r.claimed_at,
    verifiedAt: r.verified_at,
  };
}

/** Render the display-name template, e.g. "Goddess Petra's pet #7".
 *  (Pure rule lives in ./format so it's testable outside the server runtime.) */
export const petName = petDisplayName;

export async function getPet(userId: string): Promise<Pet | null> {
  if (!userId) return null;
  const pool = await db();
  const [rows] = await pool.query("SELECT * FROM pets WHERE user_id = ?", [
    userId,
  ]);
  const r = (rows as any[])[0];
  return r ? rowToPet(r) : null;
}

/** Claim a number (idempotent — claiming twice returns the same pet). */
export async function claimPet(p: {
  userId: string;
  username: string;
  name: string;
  image: string;
}): Promise<Pet | null> {
  const userId = (p.userId || "").slice(0, 40);
  if (!userId) return null;
  const pool = await db();
  // INSERT IGNORE + re-select: safe under races, and re-claiming is a no-op.
  await pool.query(
    `INSERT IGNORE INTO pets
       (user_id, username, name, image, verified, claimed_at, verified_at)
     VALUES (?, ?, ?, ?, 0, ?, '')`,
    [
      userId,
      (p.username || "").slice(0, 40),
      (p.name || "").slice(0, 120),
      (p.image || "").slice(0, 300),
      new Date().toISOString(),
    ],
  );
  return getPet(userId);
}

/** Public roster ("the herd") — lowest numbers first. */
export async function listPets(limit = 200): Promise<Pet[]> {
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT * FROM pets ORDER BY number ASC LIMIT ${clampInt(limit, 1, 1000)}`,
  );
  return (rows as any[]).map(rowToPet);
}

export async function countPets(): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query("SELECT COUNT(*) c FROM pets");
  return Number((rows as any[])[0]?.c) || 0;
}

/**
 * Record whether their X display name currently matches. Also refreshes the
 * cached handle/avatar so the roster stays current. Called from the OAuth
 * callback on every sign-in.
 */
export async function syncVerification(p: {
  userId: string;
  username: string;
  name: string;
  image: string;
  expectedName: string;
}): Promise<void> {
  const pet = await getPet(p.userId);
  if (!pet) return;
  const ok = petNameMatches(p.name, p.expectedName);
  const pool = await db();
  await pool.query(
    `UPDATE pets SET verified = ?, verified_at = ?, username = ?, name = ?, image = ?
     WHERE user_id = ?`,
    [
      ok ? 1 : 0,
      ok ? new Date().toISOString() : "",
      (p.username || "").slice(0, 40),
      (p.name || "").slice(0, 120),
      (p.image || "").slice(0, 300),
      p.userId,
    ],
  );
}

/** Admin: strip a pet of its number. */
export async function deletePet(number: number): Promise<void> {
  const pool = await db();
  await pool.query("DELETE FROM pets WHERE number = ?", [number]);
}
