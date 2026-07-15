import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import {
  sendUserMessage,
  listThread,
  toVisitorMessage,
  markReadByUser,
  lastMessageAt,
  getFlags,
} from "@/lib/messages";
import { notifyGoddess } from "@/lib/notify";
import { pushToAdmins } from "@/lib/push";
import { isRequestBlocked } from "@/lib/blocks";

// Pictures in visitor messages must reference our own uploads.
const MEDIA_URL_RE = /^\/media\/[A-Za-z0-9._-]+$/;

// The signed-in visitor's own DM thread with the goddess.
export async function GET() {
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  }
  const [messages, flags] = await Promise.all([
    listThread(user.id),
    getFlags(user.id).catch(() => null),
  ]);
  try {
    await markReadByUser(user.id);
  } catch {
    /* ignore */
  }
  return NextResponse.json({
    messages: messages.map(toVisitorMessage),
    chat: { blocked: flags?.blocked ?? false },
  });
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

  // Site-wide ban (IP or X account) — a hard no, distinct from a chat mute.
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  try {
    const flags = await getFlags(user.id);
    if (flags.blocked) {
      return NextResponse.json(
        { error: "you're muted. cry about it ♡" },
        { status: 403 },
      );
    }
  } catch {
    /* if the check fails, allow the message */
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
  const mediaUrl =
    typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  if (mediaUrl && !MEDIA_URL_RE.test(mediaUrl)) {
    return NextResponse.json({ error: "Bad media URL." }, { status: 400 });
  }
  if (!text && !mediaUrl) {
    return NextResponse.json({ error: "Say something." }, { status: 400 });
  }

  const message = await sendUserMessage({
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    body: text.slice(0, 2000),
    mediaUrl,
  });

  const preview = text ? text.slice(0, 80) : "· sent a picture ·";
  notifyGoddess(`💬 @${user.username}: ${preview}`);
  pushToAdmins(`@${user.username}`, preview, "/admin/inbox");

  return NextResponse.json({ message: toVisitorMessage(message) });
}
