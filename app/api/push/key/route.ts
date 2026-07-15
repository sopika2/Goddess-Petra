import { NextResponse } from "next/server";
import { getVapid } from "@/lib/push";

// Public VAPID key for the browser's pushManager.subscribe(). Generating it
// lazily here means push works with zero manual setup.
export async function GET() {
  try {
    const { publicKey } = await getVapid();
    return NextResponse.json({ key: publicKey });
  } catch {
    return NextResponse.json({ error: "Push unavailable." }, { status: 500 });
  }
}
