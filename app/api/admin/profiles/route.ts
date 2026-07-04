import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { createProfile, listProfiles } from "@/lib/db";
import { sanitizeHandle } from "@/lib/format";
import type { ProfileInput } from "@/lib/types";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listProfiles());
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const consentOnFile = body?.consentOnFile === true;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!consentOnFile) {
    return NextResponse.json(
      { error: "You must confirm consent is on file before publishing." },
      { status: 400 },
    );
  }

  const input: ProfileInput = {
    slug: String(body?.slug ?? "").trim(),
    name,
    tagline: String(body?.tagline ?? "").trim(),
    twitter: sanitizeHandle(String(body?.twitter ?? "")),
    thumbnail: String(body?.thumbnail ?? "").trim(),
    info: String(body?.info ?? ""),
    gallery: Array.isArray(body?.gallery)
      ? body.gallery.filter((g: unknown) => typeof g === "string")
      : [],
    consentOnFile: true,
    hidden: false,
  };

  const profile = await createProfile(input);
  return NextResponse.json(profile, { status: 201 });
}
