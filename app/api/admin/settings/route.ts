import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getSettings());
}

const STRING_KEYS: (keyof SiteSettings)[] = [
  "siteName",
  "tagline",
  "throneUrl",
  "throneKicker",
  "throneHeading",
  "throneNote",
  "throneStamp",
  "throneButton",
  "dmFeeNote",
  "wallHeading",
  "wallSub",
  "wallEmpty",
  "footerThreat",
  "contactEmail",
  "adsNavLabel",
  "adsHeading",
  "adsSub",
  "adsNote",
  "adsFeedScript",
  "adsFeedHead",
  "adsTxt",
  "verificationTags",
  "gamesNavLabel",
  "gamesHeading",
  "gamesSub",
  "gamesNote",
  "wheelForced",
  "chatNavLabel",
  "chatHeading",
  "chatSub",
  "chatNote",
  "telegramBotToken",
  "telegramChatId",
  "secretLoginKey",
  "confessNavLabel",
  "confessHeading",
  "confessSub",
  "confessNote",
];

export async function PUT(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const patch: Partial<SiteSettings> = {};
  for (const k of STRING_KEYS) {
    const v = body?.[k];
    if (typeof v === "string") (patch as Record<string, string>)[k] = v;
  }
  if (Array.isArray(body?.bioLines)) {
    patch.bioLines = body.bioLines.filter((l: unknown) => typeof l === "string");
  }
  if (Array.isArray(body?.adsSlots)) {
    patch.adsSlots = body.adsSlots.filter((s: unknown) => typeof s === "string");
  }
  if (Array.isArray(body?.wheelSegments)) {
    patch.wheelSegments = body.wheelSegments.filter(
      (s: unknown) => typeof s === "string",
    );
  }
  if (Array.isArray(body?.chatQuickReplies)) {
    patch.chatQuickReplies = body.chatQuickReplies.filter(
      (s: unknown) => typeof s === "string",
    );
  }
  if (Array.isArray(body?.tributePresets)) {
    patch.tributePresets = body.tributePresets.filter(
      (s: unknown) => typeof s === "string",
    );
  }
  if (typeof body?.feedEnabled === "boolean") {
    patch.feedEnabled = body.feedEnabled;
  }
  if (typeof body?.gamesEnabled === "boolean") {
    patch.gamesEnabled = body.gamesEnabled;
  }
  if (typeof body?.chatEnabled === "boolean") {
    patch.chatEnabled = body.chatEnabled;
  }
  if (typeof body?.confessionsEnabled === "boolean") {
    patch.confessionsEnabled = body.confessionsEnabled;
  }
  if (typeof body?.adsFeedCooldownSeconds === "number" && isFinite(body.adsFeedCooldownSeconds)) {
    patch.adsFeedCooldownSeconds = Math.max(5, Math.min(86400, Math.floor(body.adsFeedCooldownSeconds)));
  }
  const saved = await updateSettings(patch);
  return NextResponse.json(saved);
}
