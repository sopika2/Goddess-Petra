import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { getFlags } from "@/lib/messages";
import { isRequestBlocked } from "@/lib/blocks";
import {
  listRoom,
  postRoomMessage,
  lastRoomPostAt,
  hideRoomMessage,
} from "@/lib/lounge";
import { notifyGoddess } from "@/lib/notify";

// The Lounge — one public live chat room. Reading is open to everyone; posting
// needs an X sign-in (or the admin). The goddess can delete any line.

const GODDESS_AVATAR = "/goddess-petra.jpg";

// GET is public: the feed + pinned note + whether the viewer can moderate.
export async function GET() {
  const [messages, s, admin] = await Promise.all([
    listRoom(),
    getSettings(),
    isAuthed(),
  ]);
  return NextResponse.json({
    messages,
    pinned: s.loungePinned || "",
    isAdmin: admin,
  });
}

export async function POST(req: Request) {
  const s = await getSettings();
  if (!s.loungeEnabled) {
    return NextResponse.json({ error: "The lounge is closed." }, { status: 403 });
  }

  const admin = await isAuthed();
  const user = await readUserSession();
  if (!admin && !user) {
    return NextResponse.json(
      { error: "Sign in with X to talk." },
      { status: 401 },
    );
  }

  const actorId = user?.id || "goddess";

  // Site-wide ban (IP or X account) — a hard no. Admins are never blocked.
  if (!admin && (await isRequestBlocked(req.headers, actorId))) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  // A chat mute (per-account) also silences the lounge.
  if (!admin && user) {
    try {
      if ((await getFlags(user.id)).blocked) {
        return NextResponse.json(
          { error: "you're muted. cry about it ♡" },
          { status: 403 },
        );
      }
    } catch {
      /* allow on check failure */
    }
  }

  // Rate limit: 1 line / 3s per account.
  try {
    if (Date.now() - (await lastRoomPostAt(actorId)) < 3000) {
      return NextResponse.json({ error: "slow down ♡" }, { status: 429 });
    }
  } catch {
    /* allow on check failure */
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.message === "string" ? body.message.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Say something." }, { status: 400 });
  }

  // The admin always posts branded as the goddess; everyone else as themselves.
  const message = admin
    ? await postRoomMessage({
        userId: "goddess",
        username: "",
        name: s.siteName,
        image: GODDESS_AVATAR,
        sender: "goddess",
        body: text.slice(0, 500),
      })
    : await postRoomMessage({
        userId: user!.id,
        username: user!.username,
        name: user!.name,
        image: user!.image,
        sender: "user",
        body: text.slice(0, 500),
      });

  // Ping the goddess when a visitor speaks in the room (not for her own lines).
  if (!admin && user) {
    notifyGoddess(`🗣️ lounge · @${user.username}: ${text.slice(0, 80)}`);
  }

  return NextResponse.json({ message });
}

// Moderation: hide a line. Admin only.
export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await hideRoomMessage(id);
  return NextResponse.json({ ok: true });
}
