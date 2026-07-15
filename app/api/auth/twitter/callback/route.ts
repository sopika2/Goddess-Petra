import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  cookieSecure,
  expectedToken,
  isSessionSecretConfigured,
} from "@/lib/auth";
import {
  exchangeCode,
  fetchMe,
  isAllowedAdmin,
  safeEqual,
  TW_STATE_COOKIE,
  TW_VERIFIER_COOKIE,
} from "@/lib/twitter";
import { logLogin } from "@/lib/analytics";
import { clientIp } from "@/lib/ip";
import { isXBlocked } from "@/lib/blocks";
import { appUrl } from "@/lib/url";
import {
  serializeUserSession,
  USER_COOKIE,
  USER_COOKIE_OPTS,
} from "@/lib/usersession";
import type { TwitterUser } from "@/lib/twitter";

const TEMP_CLEAR = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

function clearTemp(res: NextResponse) {
  res.cookies.set(TW_STATE_COOKIE, "", TEMP_CLEAR);
  res.cookies.set(TW_VERIFIER_COOKIE, "", TEMP_CLEAR);
}

// Failures (no identity) end here: send the visitor home with no session and no
// error message. Successful non-admin sign-ins instead go through bounceHome but
// WITH a user-session cookie attached (see below) so the site greets them.
function bounceHome(req: NextRequest) {
  const res = NextResponse.redirect(appUrl("/", req));
  res.headers.set("Referrer-Policy", "no-referrer");
  clearTemp(res);
  return res;
}

// Attach the signed "logged in as this X user" cookie to a response. Grants no
// privileges — it just lets the site show their avatar + name.
function attachUserSession(res: NextResponse, me: TwitterUser) {
  const value = serializeUserSession({
    id: me.id,
    username: me.username,
    name: me.name,
    image: me.profileImageUrl || "",
  });
  if (value) res.cookies.set(USER_COOKIE, value, USER_COOKIE_OPTS);
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return bounceHome(req);

  const storedState = req.cookies.get(TW_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(TW_VERIFIER_COOKIE)?.value;

  // Require everything; validate state in constant time (CSRF protection).
  if (
    !code ||
    !state ||
    !storedState ||
    !verifier ||
    !safeEqual(state, storedState)
  ) {
    return bounceHome(req);
  }

  const accessToken = await exchangeCode({ code, verifier });
  if (!accessToken) return bounceHome(req);

  const me = await fetchMe(accessToken);
  if (!me) return bounceHome(req);

  const allowed = isAllowedAdmin(me);
  // Audit log: record this X login (full identity + IP), admin or not. Never let
  // an audit-write failure block the actual sign-in.
  try {
    await logLogin({
      ip: clientIp(req.headers),
      ua: (req.headers.get("user-agent") || "").slice(0, 300),
      twitterId: me.id,
      twitterUsername: me.username,
      twitterName: me.name,
      allowed,
      image: me.profileImageUrl,
      bio: me.description,
      location: me.location,
      url: me.url,
      verified: me.verified,
      accountCreated: me.createdAt,
      followers: me.followers,
      following: me.following,
      tweets: me.tweets,
    });
  } catch (e) {
    console.warn("[oauth] login audit write failed:", (e as Error).message);
  }

  // A banned X account never gets a session — treat the sign-in as if it
  // failed. (The allow-listed admin can never be blocked.)
  if (!allowed && (await isXBlocked(me.id).catch(() => false))) {
    return bounceHome(req);
  }

  // Everyone who signs in gets a (non-privileged) user session so the site can
  // greet them by avatar + name. Admins additionally get the admin session.
  if (!allowed) return attachUserSession(bounceHome(req), me);

  // Right admin, but the server can't mint a session without a real secret.
  if (!isSessionSecretConfigured()) {
    const res = NextResponse.redirect(
      appUrl("/admin/login?error=server_config", req),
    );
    res.headers.set("Referrer-Policy", "no-referrer");
    clearTemp(res);
    return res;
  }

  // Success — only the allowed admin reaches here.
  if (!(process.env.ADMIN_TWITTER_ID || "").trim()) {
    // Help the operator pin the immutable id (then username fallback can be dropped).
    console.warn(
      `[oauth] Admin logged in via username fallback. To harden, add to .env.local: ADMIN_TWITTER_ID=${me.id} (resolved from @${me.username})`,
    );
  }

  // Destination is hardcoded — never honor a user-supplied return URL.
  const res = NextResponse.redirect(appUrl("/admin", req));
  res.headers.set("Referrer-Policy", "no-referrer");
  clearTemp(res);
  res.cookies.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return attachUserSession(res, me);
}
