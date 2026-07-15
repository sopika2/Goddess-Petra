import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDossier } from "@/lib/dossier";

// Everything known about one sub (X stats, IPs, spins, confessions, private
// note) for the inbox side panel.
export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (new URL(req.url).searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  return NextResponse.json(await getDossier(userId));
}
