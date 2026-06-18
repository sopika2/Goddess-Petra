import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  cookieSecure,
  expectedToken,
  isSessionSecretConfigured,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  if (!isSessionSecretConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server not configured: set a strong ADMIN_SESSION_SECRET in .env.local and restart.",
      },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password: string = body?.password ?? "";

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Incorrect password, or password login is disabled." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    // Secure when behind HTTPS/Cloudflare (see cookieSecure); off for plain-http
    // LAN/laptop runs so login still works.
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
