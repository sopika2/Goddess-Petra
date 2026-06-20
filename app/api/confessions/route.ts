import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { createConfession, lastConfessionAt } from "@/lib/confessions";
import { clientIp } from "@/lib/ip";

// Submit a confession (X-login required). It's stored as PENDING and only goes
// public after the admin approves it. The public never sees who sent it.
export async function POST(req: Request) {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with X to confess." },
      { status: 401 },
    );
  }
  const s = await getSettings();
  if (!s.confessionsEnabled) {
    return NextResponse.json({ error: "Confessions are off." }, { status: 403 });
  }

  // Light rate-limit: 1 confession / 20s per account.
  try {
    if (Date.now() - (await lastConfessionAt(user.id)) < 20000) {
      return NextResponse.json(
        { error: "slow down — one at a time ♡" },
        { status: 429 },
      );
    }
  } catch {
    /* if the check fails, allow it */
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Confess something." }, { status: 400 });
  }

  await createConfession({
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    body: text.slice(0, 2000),
    ip: clientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
