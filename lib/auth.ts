import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin auth for a single-operator, self-hosted site. A valid session is a
 * cookie whose value equals expectedToken() — a token derived ONLY from
 * ADMIN_SESSION_SECRET (never from the password, never publicly computable as
 * long as the secret is strong and private).
 *
 * Both login paths (password and "Sign in with X") mint this same token, but
 * ONLY after their own check passes:
 *   - password path: verifyPassword() (disabled if no password is configured)
 *   - X path:        isAllowedAdmin() in the OAuth callback
 *
 * We FAIL CLOSED: if no strong secret is configured, no session can be minted
 * or accepted, so the admin area is simply unreachable until one is set.
 */

export const COOKIE_NAME = "gp_admin_session";

// Placeholder values that must never be accepted as a real secret.
const PLACEHOLDER_SECRETS = new Set([
  "insecure-default-secret",
  "replace-with-a-long-random-string",
]);

function rawSecret(): string {
  return (process.env.ADMIN_SESSION_SECRET || "").trim();
}

/**
 * True only when ADMIN_SESSION_SECRET is a real, strong value (set, long
 * enough, and not a known placeholder). Drives the fail-closed behavior.
 */
export function isSessionSecretConfigured(): boolean {
  const s = rawSecret();
  if (s.length < 24) return false;
  if (PLACEHOLDER_SECRETS.has(s)) return false;
  if (/change-?me|insecure|placeholder|example/i.test(s)) return false;
  return true;
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

/**
 * Whether auth cookies should carry the `Secure` flag (sent only over HTTPS).
 *  - COOKIE_SECURE=1/0 forces it on/off explicitly.
 *  - Otherwise it follows TRUST_PROXY_HEADERS: behind the Cloudflare tunnel the
 *    visitor's connection IS HTTPS, so Secure is correct and prevents the admin
 *    token from ever crossing a plaintext hop. For a bare http LAN/laptop run
 *    (TRUST_PROXY_HEADERS unset) it stays off so login still works.
 */
export function cookieSecure(): boolean {
  const v = (process.env.COOKIE_SECURE || "").trim();
  if (v === "1") return true;
  if (v === "0") return false;
  return process.env.TRUST_PROXY_HEADERS === "1";
}

/** Stable, unforgeable session token — derived ONLY from the secret. */
export function expectedToken(): string {
  return crypto
    .createHmac("sha256", rawSecret())
    .update("gp-admin-session-v1")
    .digest("hex");
}

/**
 * Constant-time check of a submitted password. Password login is DISABLED
 * (always false) when no password is configured — so an empty/unset
 * ADMIN_PASSWORD can never authenticate.
 */
export function verifyPassword(submitted: string): boolean {
  const expected = adminPassword();
  if (!expected) return false; // no password configured -> password login off
  const a = Buffer.from(submitted || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** True if the current request carries a valid admin session cookie. */
export async function isAuthed(): Promise<boolean> {
  if (!isSessionSecretConfigured()) return false; // fail closed
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
