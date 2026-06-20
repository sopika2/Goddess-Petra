import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listThread, markReadByAdmin } from "@/lib/messages";

// One conversation's full thread; opening it marks the user's lines as read.
export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (new URL(req.url).searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const messages = await listThread(userId);
  try {
    await markReadByAdmin(userId);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ messages });
}
