import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { playerRecord, topDebtors, recentPublicRolls } from "@/lib/games";

// The scoreboard behind the games: your own file, the wall of shame, and the
// live ticker. Public (the shame is the point) but never exposes IPs.
export async function GET() {
  const s = await getSettings();
  if (!s.gamesEnabled) {
    return NextResponse.json({ enabled: false });
  }
  const user = await readUserSession();
  const [leaders, ticker, me] = await Promise.all([
    topDebtors(10),
    recentPublicRolls(12),
    user ? playerRecord(user.id) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    enabled: true,
    signedIn: !!user,
    me,
    leaders,
    ticker,
  });
}
