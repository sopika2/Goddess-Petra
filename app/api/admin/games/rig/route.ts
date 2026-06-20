import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { setRig } from "@/lib/games";

// Admin sets/clears a per-account wheel rig. remaining: -1 = unlimited,
// N>0 = that many forced spins, 0 (or empty result) = clear.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const username = typeof body?.username === "string" ? body.username : "";
  const result = typeof body?.result === "string" ? body.result : "";
  let remaining = Number(body?.remaining);
  if (!Number.isFinite(remaining)) remaining = 0;
  remaining = Math.max(-1, Math.floor(remaining));
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  await setRig(userId, username, result, remaining);
  return NextResponse.json({ ok: true });
}
