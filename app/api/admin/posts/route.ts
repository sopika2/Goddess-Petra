import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listPosts, createPost, deletePost, setPinned } from "@/lib/posts";
import { getSettings } from "@/lib/settings";
import { pushToAllUsers } from "@/lib/push";

// Admin management of the home timeline. GET lists everything (with tallies),
// POST creates a post/poll, PATCH pins/unpins, DELETE removes.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ posts: await listPosts(undefined, 200) });
}

const MEDIA_URL_RE = /^\/media\/[A-Za-z0-9._-]+$/;

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  if (mediaUrl && !MEDIA_URL_RE.test(mediaUrl)) {
    return NextResponse.json({ error: "Bad media URL." }, { status: 400 });
  }
  const pollOptions = Array.isArray(body?.pollOptions)
    ? body.pollOptions.filter((o: unknown) => typeof o === "string")
    : [];
  if (!text && !mediaUrl && pollOptions.filter((o: string) => o.trim()).length < 2) {
    return NextResponse.json({ error: "Nothing to post." }, { status: 400 });
  }
  const id = await createPost({
    body: text,
    mediaUrl,
    linkLabel: typeof body?.linkLabel === "string" ? body.linkLabel : "",
    linkUrl: typeof body?.linkUrl === "string" ? body.linkUrl : "",
    pollOptions,
  });

  // Ping subscribers that the goddess posted (only when the board is live).
  try {
    const s = await getSettings();
    if (s.boardEnabled) {
      const preview =
        text.slice(0, 90) ||
        (pollOptions.length >= 2 ? "a new poll — vote, loser ♡" : "new post ♡");
      pushToAllUsers("Goddess Petra posted ♡", preview, "/");
    }
  } catch {
    /* never let a ping block the post */
  }

  return NextResponse.json({ id });
}

export async function PATCH(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await setPinned(id, body?.pinned === true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deletePost(id);
  return NextResponse.json({ ok: true });
}
