import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sendMessage } from "@/lib/messages";

// Admin ("goddess") replies into a user's conversation.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const text = typeof body?.message === "string" ? body.message.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Empty reply" }, { status: 400 });
  }
  const message = await sendMessage({
    userId,
    username: typeof body?.username === "string" ? body.username : "",
    name: typeof body?.name === "string" ? body.name : "",
    image: typeof body?.image === "string" ? body.image : "",
    sender: "goddess",
    body: text.slice(0, 2000),
  });
  return NextResponse.json({ message });
}
