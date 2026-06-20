import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import {
  sendMessage,
  listThread,
  markReadByUser,
  lastMessageAt,
} from "@/lib/messages";

// The signed-in visitor's own DM thread with the goddess.
export async function GET() {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  }
  const messages = await listThread(user.id);
  try {
    await markReadByUser(user.id);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  }
  const s = await getSettings();
  if (!s.chatEnabled) {
    return NextResponse.json({ error: "Chat is off." }, { status: 403 });
  }

  // Light rate-limit: 1 message / 3s per account.
  try {
    if (Date.now() - (await lastMessageAt(user.id, "user")) < 3000) {
      return NextResponse.json({ error: "slow down ♡" }, { status: 429 });
    }
  } catch {
    /* if the check fails, allow the message */
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.message === "string" ? body.message.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Say something." }, { status: 400 });
  }

  const message = await sendMessage({
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    sender: "user",
    body: text.slice(0, 2000),
  });
  return NextResponse.json({ message });
}
