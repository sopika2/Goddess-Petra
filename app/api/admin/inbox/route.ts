import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listConversations, totalUnread } from "@/lib/messages";
import { getSettings } from "@/lib/settings";

// Conversation list for the admin inbox (Fansly-style): pinned first, then
// newest. Also carries the quick-reply chips.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [conversations, unread, settings] = await Promise.all([
    listConversations(),
    totalUnread(),
    getSettings(),
  ]);
  // "label|url" lines → one-tap tribute chips for the ♛ composer.
  const tributePresets = settings.tributePresets
    .map((line) => {
      const i = line.indexOf("|");
      if (i < 1) return null;
      const label = line.slice(0, i).trim();
      const url = line.slice(i + 1).trim();
      return label && /^https?:\/\//.test(url) ? { label, url } : null;
    })
    .filter((p): p is { label: string; url: string } => p !== null);
  return NextResponse.json({
    conversations,
    unread,
    quickReplies: settings.chatQuickReplies,
    tributePresets,
  });
}
