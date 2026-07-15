import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sendGoddessMessage } from "@/lib/messages";
import { getSettings, isSafeUrl } from "@/lib/settings";
import { pushToUser } from "@/lib/push";

// Media in replies must reference our own uploads — never an external URL.
const MEDIA_URL_RE = /^\/media\/[A-Za-z0-9._-]+$/;

// Admin ("goddess") replies into a user's conversation. Identity fields are
// derived from the thread server-side — anything the client sends for
// username/name/image is ignored. kind "tribute" sends the pay-me sticker:
// its link defaults to the settings Throne URL but can be a specific
// throne gift link pasted in the composer.
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
  const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  if (mediaUrl && !MEDIA_URL_RE.test(mediaUrl)) {
    return NextResponse.json({ error: "Bad media URL." }, { status: 400 });
  }

  const tribute = body?.kind === "tribute";
  let link = "";
  if (tribute) {
    const s = await getSettings();
    const custom = typeof body?.link === "string" ? body.link.trim() : "";
    link = custom || s.throneUrl;
    if (!isSafeUrl(link)) {
      return NextResponse.json({ error: "Bad tribute link." }, { status: 400 });
    }
  }
  if (!text && !mediaUrl && !tribute) {
    return NextResponse.json({ error: "Empty reply" }, { status: 400 });
  }

  const message = await sendGoddessMessage({
    userId,
    body: text.slice(0, 2000),
    mediaUrl,
    kind: tribute ? "tribute" : "text",
    link,
  });
  if (!message) {
    return NextResponse.json({ error: "No such conversation." }, { status: 404 });
  }

  pushToUser(
    userId,
    "goddess petra ♡",
    tribute
      ? "tribute demanded. pay up ♡"
      : text
        ? text.slice(0, 80)
        : "· sent you something ·",
    "/chat",
  );

  return NextResponse.json({ message });
}
