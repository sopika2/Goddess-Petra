import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { isRequestBlocked } from "@/lib/blocks";
import { sendUserMessage, lastMessageAt } from "@/lib/messages";
import { notifyGoddess } from "@/lib/notify";
import { pushToAdmins } from "@/lib/push";

// When the wheel lands on an "info" segment, whatever they hand over arrives
// as a DM in her inbox — so it lands in the thread she already reads, shows up
// in their dossier, and pings her. No separate box to remember to check.
export async function POST(req: Request) {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const s = await getSettings();
  if (!s.gamesEnabled) {
    return NextResponse.json({ error: "Games are off." }, { status: 403 });
  }
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  // Light rate-limit: reuse the DM limiter so this can't be used to spam.
  try {
    if (Date.now() - (await lastMessageAt(user.id, "user")) < 3000) {
      return NextResponse.json({ error: "slow down ♡" }, { status: 429 });
    }
  } catch {
    /* allow on check failure */
  }

  const body = await req.json().catch(() => ({}));
  const demand = typeof body?.demand === "string" ? body.demand.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!answer) {
    return NextResponse.json({ error: "Hand it over." }, { status: 400 });
  }

  await sendUserMessage({
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    body: `🎲 the wheel took this from me${demand ? ` — ${demand.slice(0, 120)}` : ""}:\n\n${answer.slice(0, 1500)}`,
  });

  notifyGoddess(`🎲 @${user.username} handed over: ${answer.slice(0, 80)}`);
  pushToAdmins(`@${user.username} handed something over`, answer.slice(0, 80), "/admin/inbox");

  return NextResponse.json({ ok: true });
}
