import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { getSettings } from "@/lib/settings";
import { isRequestBlocked } from "@/lib/blocks";
import { vote, listPosts } from "@/lib/posts";

// Cast a poll vote (X sign-in required, one vote per poll). Returns the fresh
// tallies for that post so the UI can flip straight to results.
export async function POST(req: Request) {
  const s = await getSettings();
  if (!s.boardEnabled) {
    return NextResponse.json({ error: "Voting is off." }, { status: 403 });
  }
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with X to vote." },
      { status: 401 },
    );
  }
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const postId = typeof body?.postId === "string" ? body.postId : "";
  const optionId = typeof body?.optionId === "string" ? body.optionId : "";
  if (!postId || !optionId) {
    return NextResponse.json({ error: "Missing vote." }, { status: 400 });
  }

  const res = await vote(postId, optionId, user.id);
  if (!res.ok) {
    return NextResponse.json({ error: "Bad vote." }, { status: 400 });
  }

  // Return the single updated post (with the viewer's vote reflected).
  const posts = await listPosts(user.id);
  const post = posts.find((p) => p.id === postId) || null;
  return NextResponse.json({ post });
}
