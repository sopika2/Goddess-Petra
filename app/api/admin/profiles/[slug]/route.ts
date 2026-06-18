import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteProfile, updateProfile } from "@/lib/db";
import { sanitizeHandle } from "@/lib/format";
import type { ProfileInput } from "@/lib/types";

type Params = { slug: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Partial<ProfileInput> = {};
  if (typeof body?.name === "string") patch.name = body.name.trim();
  if (typeof body?.tagline === "string") patch.tagline = body.tagline.trim();
  if (typeof body?.twitter === "string")
    patch.twitter = sanitizeHandle(body.twitter);
  if (typeof body?.thumbnail === "string") patch.thumbnail = body.thumbnail.trim();
  if (typeof body?.info === "string") patch.info = body.info;
  if (typeof body?.consentOnFile === "boolean")
    patch.consentOnFile = body.consentOnFile;
  if (Array.isArray(body?.gallery))
    patch.gallery = body.gallery.filter((g: unknown) => typeof g === "string");

  if (patch.name !== undefined && patch.name === "") {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  const updated = await updateProfile(slug, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const ok = await deleteProfile(slug);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
