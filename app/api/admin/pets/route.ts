import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listPets, deletePet } from "@/lib/pets";

// Admin view of the herd + the ability to strip a pet of its number.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ pets: await listPets(1000) });
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const number = Math.floor(Number(body?.number));
  if (!isFinite(number) || number < 1) {
    return NextResponse.json({ error: "Missing number" }, { status: 400 });
  }
  await deletePet(number);
  return NextResponse.json({ ok: true });
}
