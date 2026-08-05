import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import {
  logRoll,
  lastRollAt,
  getRig,
  decrementRig,
  spinRoulette,
  parseSegments,
  chooseSegment,
  effectiveSegments,
  type RouletteColor,
} from "@/lib/games";
import { clientIp } from "@/lib/ip";
import { isRequestBlocked } from "@/lib/blocks";
import { notifyGoddess } from "@/lib/notify";
import { pushToAdmins } from "@/lib/push";

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
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
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
  const rig = await getRig(user.id);

  let result: string;
  let rigged: boolean;
  let payload: Record<string, unknown>;

  if (game === "roulette") {
    if (!s.rouletteEnabled) {
      return NextResponse.json(
        { error: "The roulette table is closed." },
        { status: 403 },
      );
    }
    // They pick a colour; the zero belongs to the house either way.
    const bet: RouletteColor = body?.bet === "black" ? "black" : "red";
    // A rig only applies here when it names a colour (the same rig field also
    // serves the wheel, where it names a segment).
    const rigColor = (rig?.result || "").trim().toLowerCase();
    const usableRig =
      rig && ["red", "black", "green"].includes(rigColor) && rig.remaining !== 0;
    const spun = spinRoulette(usableRig ? rigColor : undefined);
    rigged = spun.rigged;
    if (usableRig) {
      try {
        await decrementRig(user.id);
      } catch {
        /* ignore */
      }
    }

    const won = spun.color === bet;
    const stake = Math.max(0, Math.floor(s.rouletteStake));
    const cost = spun.color === "green" ? stake * 5 : won ? 0 : stake;
    result = won
      ? `${spun.number} ${spun.color} · spared ♡`
      : spun.color === "green"
        ? `${spun.number} green · $${cost} tribute — drained`
        : `${spun.number} ${spun.color} · $${cost} tribute`;
    payload = {
      number: spun.number,
      color: spun.color,
      bet,
      won,
      cost,
      result,
    };
  } else {
    // Their own wheel if she gave them one, otherwise the default.
    const segments = parseSegments(effectiveSegments(s.wheelSegments, rig));
    // Her controls, all invisible to the player: a forced result for this
    // account, a global forced result, and per-account banned segments.
    const chosen = chooseSegment({
      segments,
      excluded: rig?.excluded || [],
      rigResult: rig?.result,
      rigActive: !!rig && rig.remaining !== 0,
      globalForced: s.wheelForced,
    });
    if (!chosen) {
      return NextResponse.json(
        { error: "Nothing left for you to land on." },
        { status: 400 },
      );
    }
    // Only a per-account forced hit consumes a use.
    if (chosen.rigged && rig && rig.remaining !== 0 && rig.result === chosen.segment.label) {
      try {
        await decrementRig(user.id);
      } catch {
        /* ignore */
      }
    }
    rigged = chosen.rigged;
    result = chosen.segment.label;
    payload = {
      result,
      index: chosen.index,
      kind: chosen.segment.kind,
      // The reward/demand only ever leaves the server for the segment they
      // actually landed on — never the whole prize table.
      payload: chosen.segment.payload,
    };
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

  // Let her watch it happen live.
  notifyGoddess(`🎰 @${user.username} · ${game}: ${result}`);
  pushToAdmins(`@${user.username} spun`, result, "/admin/games");

  return NextResponse.json(payload);
}
