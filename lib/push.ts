import "server-only";
import crypto from "node:crypto";
import webpush from "web-push";
import { db } from "./database";
import { getSettings, updateSettings } from "./settings";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Web-push notifications. VAPID keys are generated once on first use and kept
// in the settings row, so there is zero manual setup. Subscriptions live in
// push_subs: role 'admin' rows are the goddess's devices (subscribed after the
// secret login / from the inbox), role 'user' rows belong to signed-in subs.
// Sending is always fire-and-forget — a dead push service must never break a
// chat request. Gone subscriptions (404/410) are pruned as we hit them.

export interface PushSubJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let vapidPromise: Promise<{ publicKey: string; privateKey: string }> | null =
  null;

/** VAPID keypair — from settings, generated + persisted on first call. */
export function getVapid(): Promise<{ publicKey: string; privateKey: string }> {
  if (!vapidPromise) {
    vapidPromise = (async () => {
      const s = await getSettings();
      if (s.vapidPublicKey && s.vapidPrivateKey) {
        return { publicKey: s.vapidPublicKey, privateKey: s.vapidPrivateKey };
      }
      const keys = webpush.generateVAPIDKeys();
      await updateSettings({
        vapidPublicKey: keys.publicKey,
        vapidPrivateKey: keys.privateKey,
      });
      return keys;
    })().catch((e) => {
      vapidPromise = null; // allow retry
      throw e;
    });
  }
  return vapidPromise;
}

export async function saveSubscription(
  role: "admin" | "user",
  userId: string,
  sub: PushSubJSON,
): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO push_subs (id, role, user_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       role = VALUES(role), user_id = VALUES(user_id),
       p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [
      crypto.randomUUID(),
      role,
      (userId || "").slice(0, 40),
      (sub.endpoint || "").slice(0, 500),
      (sub.keys?.p256dh || "").slice(0, 200),
      (sub.keys?.auth || "").slice(0, 100),
      new Date().toISOString(),
    ],
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const pool = await db();
  await pool.query("DELETE FROM push_subs WHERE endpoint = ?", [
    (endpoint || "").slice(0, 500),
  ]);
}

async function send(
  rows: any[],
  payload: { title: string; body: string; url: string },
): Promise<void> {
  if (!rows.length) return;
  const s = await getSettings();
  const vapid = await getVapid();
  const vapidDetails = {
    subject: `mailto:${s.contactEmail || "admin@example.com"}`,
    publicKey: vapid.publicKey,
    privateKey: vapid.privateKey,
  };
  const pool = await db();
  await Promise.allSettled(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify(payload),
          { vapidDetails, TTL: 24 * 3600 },
        );
      } catch (e: any) {
        // 404/410 = the browser dropped this subscription — prune it.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          try {
            await pool.query("DELETE FROM push_subs WHERE endpoint = ?", [
              r.endpoint,
            ]);
          } catch {
            /* ignore */
          }
        }
      }
    }),
  );
}

/** Ping every device the goddess has subscribed. Fire-and-forget. */
export function pushToAdmins(title: string, body: string, url: string): void {
  void (async () => {
    try {
      const pool = await db();
      const [rows] = await pool.query(
        "SELECT endpoint, p256dh, auth FROM push_subs WHERE role = 'admin'",
      );
      await send(rows as any[], { title, body, url });
    } catch {
      /* never let a ping break the site */
    }
  })();
}

/** Ping one sub's devices ("she answered ♡"). Fire-and-forget. */
export function pushToUser(
  userId: string,
  title: string,
  body: string,
  url: string,
): void {
  void (async () => {
    try {
      const pool = await db();
      const [rows] = await pool.query(
        "SELECT endpoint, p256dh, auth FROM push_subs WHERE role = 'user' AND user_id = ?",
        [userId],
      );
      await send(rows as any[], { title, body, url });
    } catch {
      /* never let a ping break the site */
    }
  })();
}
