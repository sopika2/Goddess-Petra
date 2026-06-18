import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cookieSecure, isSessionSecretConfigured } from "./auth";

/**
 * Lightweight "signed-in with X" session for ANY visitor (not just the admin).
 * It carries the public X identity (id / handle / name / avatar) so the site can
 * greet them with their picture and name. It grants NO privileges — admin access
 * is still gated solely by the separate admin session (see lib/auth.ts).
 *
 * The cookie value is `base64url(JSON).signature`, signed with HMAC-SHA256 using
 * ADMIN_SESSION_SECRET. Not encrypted (none of this is secret), but unforgeable:
 * a visitor cannot fake a different name/avatar without the server secret.
 * Fails closed (no session minted or accepted) when no strong secret is set.
 */

export const USER_COOKIE = "gp_user";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  image: string;
}

function secret(): string {
  return (process.env.ADMIN_SESSION_SECRET || "").trim();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Only store an avatar URL if it's an https one (so it's safe to render). */
function safeImage(url: string): string {
  const v = String(url || "").slice(0, 300);
  return v.startsWith("https://") ? v : "";
}

/** Cookie value for a signed-in user, or null if no signing secret is set. */
export function serializeUserSession(u: SessionUser): string | null {
  if (!isSessionSecretConfigured()) return null;
  const safe: SessionUser = {
    id: String(u.id || "").slice(0, 40),
    username: String(u.username || "").slice(0, 40),
    name: String(u.name || "").slice(0, 120),
    image: safeImage(u.image),
  };
  const payload = Buffer.from(JSON.stringify(safe)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verify(value: string): SessionUser | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!obj || typeof obj !== "object") return null;
    return {
      id: String(obj.id || ""),
      username: String(obj.username || ""),
      name: String(obj.name || ""),
      image: String(obj.image || ""),
    };
  } catch {
    return null;
  }
}

/** The signed-in X user from the request cookie, or null. Fail-closed. */
export async function readUserSession(): Promise<SessionUser | null> {
  if (!isSessionSecretConfigured()) return null;
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}

/** Cookie options shared by the routes that set/clear the user session. */
export const USER_COOKIE_OPTS = {
  httpOnly: true,
  secure: cookieSecure(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
