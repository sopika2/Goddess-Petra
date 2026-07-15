import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { COOKIE_NAME, cookieSecure, expectedToken, isSessionSecretConfigured } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/url";

// Secret login link: /gate/<key> signs the goddess in and lands on /admin —
// made for her phone, where typing the password or doing X OAuth is a pain.
// The key comes from Settings ("secret login link"); blank or under 12 chars
// means the gate is off. Anyone who has the link IS the admin, so the settings
// hint says to keep it long, random, and private. A wrong key redirects home
// with no hint that this route even exists.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const home = NextResponse.redirect(appUrl("/", req));
  if (!isSessionSecretConfigured()) return home;

  const s = await getSettings();
  const expected = (s.secretLoginKey || "").trim();
  if (expected.length < 12) return home; // gate disabled

  const { key } = await params;
  const given = (key || "").trim();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn("[gate] failed secret-login attempt");
    return home;
  }

  const res = NextResponse.redirect(appUrl("/admin", req));
  res.cookies.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
