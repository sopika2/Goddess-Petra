import "server-only";
import crypto from "node:crypto";

/**
 * X (Twitter) OAuth 2.0 Authorization Code Flow with PKCE — used to log the
 * admin in as a specific X account. Spec verified against docs.x.com (2025-26):
 *  - authorize:  https://x.com/i/oauth2/authorize  (twitter.com also works)
 *  - token:      https://api.twitter.com/2/oauth2/token  (form-urlencoded)
 *  - identity:   https://api.twitter.com/2/users/me  (Bearer user token)
 *  - scopes:     "tweet.read users.read" (no offline.access for one-time login)
 *  - confidential client (has secret) -> HTTP Basic auth header at token endpoint
 *  - public client (no secret)        -> client_id in the body instead
 */

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const ME_URL = "https://api.twitter.com/2/users/me";
const SCOPES = "tweet.read users.read";

export const TW_STATE_COOKIE = "gp_tw_state";
export const TW_VERIFIER_COOKIE = "gp_tw_verifier";

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  /** Avatar URL (bumped to the 400px variant). */
  profileImageUrl?: string;
  description?: string;
  location?: string;
  /** The website link on their X profile. */
  url?: string;
  verified?: boolean;
  /** ISO timestamp the X account was created. */
  createdAt?: string;
  protected?: boolean;
  followers?: number;
  following?: number;
  tweets?: number;
}

// Shape of the X API user object (snake_case) before we map it.
interface RawUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  description?: string;
  location?: string;
  url?: string;
  verified?: boolean;
  created_at?: string;
  protected?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

/** X serves a tiny 48px "_normal" avatar by default — swap to the 400px one. */
export function hiResAvatar(url?: string): string {
  if (!url) return "";
  return url.replace("_normal.", "_400x400.");
}

function clientId(): string {
  return (process.env.TWITTER_CLIENT_ID || "").trim();
}
function clientSecret(): string {
  return (process.env.TWITTER_CLIENT_SECRET || "").trim();
}
export function callbackUrl(): string {
  return (
    (process.env.TWITTER_CALLBACK_URL || "").trim() ||
    "http://localhost:3000/api/auth/twitter/callback"
  );
}

/** True once a Client ID is configured — gates whether "Sign in with X" shows. */
export function isTwitterConfigured(): boolean {
  return clientId().length > 0;
}

// ---- PKCE + state -----------------------------------------------------------

/** 43-char URL-safe verifier (within RFC 7636's 43–128 range). */
export function generateVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** S256 challenge = base64url(sha256(verifier)). */
export function deriveChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Constant-time, length-safe string compare. Hashing both sides to a fixed
 * length avoids the ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH foot-gun and the
 * length-based timing leak of an early `a.length !== b.length` return.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---- Flow steps -------------------------------------------------------------

export function buildAuthorizeUrl(opts: {
  state: string;
  challenge: string;
}): string {
  // Build the query manually with encodeURIComponent so the space in `scope`
  // becomes %20 (X requires %20, not the `+` that URLSearchParams would emit).
  const params: Record<string, string> = {
    response_type: "code",
    client_id: clientId(),
    redirect_uri: callbackUrl(),
    scope: SCOPES,
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  };
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${AUTHORIZE_URL}?${qs}`;
}

/** Exchange the one-time code + PKCE verifier for a user access token. */
export async function exchangeCode(opts: {
  code: string;
  verifier: string;
}): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: callbackUrl(),
    code_verifier: opts.verifier,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret()) {
    // Confidential client: Basic auth header, secret never in the body.
    const basic = Buffer.from(`${clientId()}:${clientSecret()}`).toString(
      "base64",
    );
    headers["Authorization"] = `Basic ${basic}`;
  } else {
    // Public client: client_id goes in the body, no auth header.
    body.set("client_id", clientId());
  }

  try {
    const res = await fetch(TOKEN_URL, { method: "POST", headers, body });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the authenticated user's full profile. We request every field the
 * users.read scope allows so each login is logged as completely as possible:
 * avatar, bio, location, website, verified status, account age and the
 * follower/following/tweet counts.
 */
export async function fetchMe(accessToken: string): Promise<TwitterUser | null> {
  const fields =
    "profile_image_url,description,location,url,verified,created_at,protected,public_metrics";
  try {
    const res = await fetch(`${ME_URL}?user.fields=${encodeURIComponent(fields)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: RawUser };
    const d = json.data;
    if (!d || !d.id) return null;
    return {
      id: d.id,
      username: d.username,
      name: d.name,
      profileImageUrl: hiResAvatar(d.profile_image_url),
      description: d.description,
      location: d.location,
      url: d.url,
      verified: d.verified,
      createdAt: d.created_at,
      protected: d.protected,
      followers: d.public_metrics?.followers_count,
      following: d.public_metrics?.following_count,
      tweets: d.public_metrics?.tweet_count,
    };
  } catch {
    return null;
  }
}

/**
 * Allow-list check: only the configured admin account may authenticate.
 * Pin by immutable numeric id (ADMIN_TWITTER_ID) when known; the username is a
 * case-insensitive bootstrap fallback only (handles can change/be reassigned).
 * Fails closed if nothing is configured.
 */
export function isAllowedAdmin(me: TwitterUser): boolean {
  const id = (process.env.ADMIN_TWITTER_ID || "").trim();
  const username = (process.env.ADMIN_TWITTER_USERNAME || "").trim().toLowerCase();
  if (id) return me.id === id; // compare as strings — ids exceed MAX_SAFE_INTEGER
  if (username) return (me.username || "").toLowerCase() === username;
  return false;
}
