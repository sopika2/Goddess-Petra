import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { readUserSession } from "@/lib/usersession";
import { saveSubscription, removeSubscription } from "@/lib/push";
import type { PushSubJSON } from "@/lib/push";

function parseSub(body: unknown): PushSubJSON | null {
  const s = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  if (
    !s ||
    typeof s.endpoint !== "string" ||
    !s.endpoint.startsWith("https://") ||
    typeof s.keys?.p256dh !== "string" ||
    typeof s.keys?.auth !== "string"
  ) {
    return null;
  }
  return {
    endpoint: s.endpoint,
    keys: { p256dh: s.keys.p256dh, auth: s.keys.auth },
  };
}

// Register this browser for pushes. The goddess's devices (admin session)
// get "new DM" pings; a signed-in sub's devices get "she answered" pings.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sub = parseSub(body?.subscription);
  if (!sub) {
    return NextResponse.json({ error: "Bad subscription." }, { status: 400 });
  }

  if (await isAuthed()) {
    await saveSubscription("admin", "", sub);
    return NextResponse.json({ ok: true, role: "admin" });
  }
  const user = await readUserSession();
  if (user) {
    await saveSubscription("user", user.id, sub);
    return NextResponse.json({ ok: true, role: "user" });
  }
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

// Forget this browser (notifications toggled off client-side).
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const endpoint =
    typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }
  // Deleting by endpoint needs no auth check beyond knowing the endpoint —
  // endpoints are unguessable capability URLs only that browser ever had.
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
