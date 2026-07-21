import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { markTyping, isTyping } from "@/lib/typing";

// Visitor typing indicator. POST: "I'm typing." GET: "is the goddess typing
// to me?" Ephemeral, in-memory (see lib/typing.ts) — cheap enough to poll.
export async function POST() {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  markTyping(user.id, "user");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ typing: false }, { status: 401 });
  }
  return NextResponse.json({ typing: isTyping(user.id, "goddess") });
}
