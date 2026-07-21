import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { isAuthed } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listPosts } from "@/lib/posts";

// Public timeline feed. Includes poll tallies + like/comment counts, and (if
// signed in) which poll option the viewer picked and whether they liked. When
// the admin is viewing, isAdmin lets the UI show inline moderation controls.
export async function GET() {
  const s = await getSettings();
  if (!s.boardEnabled) {
    return NextResponse.json({ posts: [], enabled: false });
  }
  const [user, admin] = await Promise.all([readUserSession(), isAuthed()]);
  const posts = await listPosts(user?.id);
  return NextResponse.json({
    posts,
    enabled: true,
    signedIn: !!user,
    isAdmin: admin,
  });
}
