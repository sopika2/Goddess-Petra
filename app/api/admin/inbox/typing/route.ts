import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { markTyping, isTyping } from "@/lib/typing";

// Goddess-side typing indicator for one thread (?userId=...). POST: "I'm typing
// to this sub." GET: "is this sub typing to me?"
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const userId = (new URL(req.url).searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  markTyping(userId, "goddess");
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ typing: false }, { status: 401 });
  }
  const userId = (new URL(req.url).searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ typing: false });
  }
  return NextResponse.json({ typing: isTyping(userId, "user") });
}
