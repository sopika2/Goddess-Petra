import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  deriveChallenge,
  generateState,
  generateVerifier,
  isTwitterConfigured,
  TW_STATE_COOKIE,
  TW_VERIFIER_COOKIE,
} from "@/lib/twitter";
import { cookieSecure } from "@/lib/auth";
import { appUrl } from "@/lib/url";

// Kicks off "Sign in with X": generates PKCE + state, stashes them in
// short-lived httpOnly cookies, and redirects to X's authorize page.
export async function GET(req: Request) {
  if (!isTwitterConfigured()) {
    return NextResponse.redirect(
      appUrl("/admin/login?error=twitter_not_configured", req),
    );
  }

  const verifier = generateVerifier();
  const challenge = deriveChallenge(verifier);
  const state = generateState();

  const res = NextResponse.redirect(buildAuthorizeUrl({ state, challenge }));
  const opts = {
    httpOnly: true,
    // Secure when behind HTTPS/Cloudflare; off for plain-http LAN runs.
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes — only needs to outlive the round-trip to X.
  };
  res.cookies.set(TW_STATE_COOKIE, state, opts);
  res.cookies.set(TW_VERIFIER_COOKIE, verifier, opts);
  return res;
}
