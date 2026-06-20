import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listConversations, totalUnread } from "@/lib/messages";

// Conversation list for the admin inbox (Fansly-style), newest first.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [conversations, unread] = await Promise.all([
    listConversations(),
    totalUnread(),
  ]);
  return NextResponse.json({ conversations, unread });
}
