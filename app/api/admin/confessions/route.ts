import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { setStatus, deleteConfession } from "@/lib/confessions";

// Admin moderation: approve / reject / delete a confession.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  const action = typeof body?.action === "string" ? body.action : "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (action === "approve") {
    await setStatus(id, "approved");
  } else if (action === "reject") {
    await setStatus(id, "rejected");
  } else if (action === "delete") {
    await deleteConfession(id);
  } else {
    return NextResponse.json({ error: "Bad action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
