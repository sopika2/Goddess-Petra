import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { setFlags } from "@/lib/messages";

// Pin/star a conversation, block/mute a sub, or edit the private admin note.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const patch: { pinned?: boolean; blocked?: boolean; note?: string } = {};
  if (typeof body?.pinned === "boolean") patch.pinned = body.pinned;
  if (typeof body?.blocked === "boolean") patch.blocked = body.blocked;
  if (typeof body?.note === "string") patch.note = body.note;
  const flags = await setFlags(userId, patch);
  return NextResponse.json({ flags });
}
