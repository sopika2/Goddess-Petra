import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listBlocks, addBlock, removeBlock } from "@/lib/blocks";

// Manage site-wide bans (IPs + X accounts). Admin only.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ blocks: await listBlocks() });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === "x" ? "x" : "ip";
  const value = typeof body?.value === "string" ? body.value.trim() : "";
  if (!value) {
    return NextResponse.json({ error: "Nothing to block." }, { status: 400 });
  }
  const block = await addBlock({
    kind,
    value,
    username: typeof body?.username === "string" ? body.username : "",
    reason: typeof body?.reason === "string" ? body.reason : "",
  });
  if (!block) {
    return NextResponse.json({ error: "Invalid block." }, { status: 400 });
  }
  return NextResponse.json({ block });
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await removeBlock(id);
  return NextResponse.json({ ok: true });
}
