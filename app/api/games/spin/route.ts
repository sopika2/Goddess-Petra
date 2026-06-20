import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { logRoll, lastRollAt, pickResult, parseRig } from "@/lib/games";
import { clientIp } from "@/lib/ip";

// Decide a game outcome SERVER-SIDE: requires X login (so rolls tie to an
// account), honors the admin rig, logs the roll, and returns the result for the
// client to animate to. The client never decides or previews the outcome.
export async function POST(req: Request) {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with X to play." },
      { status: 401 },
    );
  }

  const s = await getSettings();
  if (!s.gamesEnabled) {
    return NextResponse.json({ error: "Games are off." }, { status: 403 });
  }

  // Light rate-limit: 1 spin / 2s per account (stops log spam).
  try {
    if (Date.now() - (await lastRollAt(user.id)) < 2000) {
      return NextResponse.json({ error: "slow down, loser" }, { status: 429 });
    }
  } catch {
    /* if the check fails, allow the spin */
  }

  const body = await req.json().catch(() => ({}));
  const game = body?.game === "roulette" ? "roulette" : "wheel";

  const segments = s.wheelSegments.map((x) => String(x)).filter(Boolean);
  const { result, index, rigged } = pickResult({
    segments,
    forced: s.wheelForced,
    rigMap: parseRig(s.wheelRig),
    username: user.username,
  });
  if (index < 0) {
    return NextResponse.json(
      { error: "No wheel segments configured." },
      { status: 400 },
    );
  }

  try {
    await logRoll({
      game,
      userId: user.id,
      username: user.username,
      name: user.name,
      result,
      rigged,
      ip: clientIp(req.headers),
    });
  } catch {
    /* never let a logging failure block the spin */
  }

  return NextResponse.json({ result, index });
}
