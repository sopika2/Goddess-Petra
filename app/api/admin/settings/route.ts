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
  "wallHeading",
  "wallSub",
  "wallEmpty",
  "footerThreat",
  "adsNavLabel",
  "adsHeading",
  "adsSub",
  "adsNote",
  "adsFeedScript",
  "adsTxt",
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
  if (typeof body?.feedEnabled === "boolean") {
    patch.feedEnabled = body.feedEnabled;
  }
  const saved = await updateSettings(patch);
  return NextResponse.json(saved);
}
