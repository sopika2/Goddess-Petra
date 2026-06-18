import { NextResponse } from "next/server";
import { logVisit, parseUa } from "@/lib/analytics";
import { clientIp } from "@/lib/ip";

// Visitor beacon — the client posts here on each page view. Node runtime so it
// can write the log. Never throws into the UI. First-party info only: what the
// request/browser already sends (no third-party lookups).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body?.path === "string" ? body.path.slice(0, 200) : "";
    if (!path || path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }
    const ua = (req.headers.get("user-agent") || "").slice(0, 300);
    const { browser, os, device } = parseUa(ua);
    const str = (x: unknown, n: number) =>
      typeof x === "string" ? x.slice(0, n) : "";

    await logVisit({
      ip: clientIp(req.headers),
      ua,
      path,
      referer: str(body?.referer, 300),
      browser,
      os,
      device,
      lang:
        str(body?.lang, 40) ||
        (req.headers.get("accept-language") || "").split(",")[0].slice(0, 40),
      tz: str(body?.tz, 60),
      screen: str(body?.screen, 20),
      viewport: str(body?.viewport, 20),
      platform: str(body?.platform, 60),
      dpr: str(body?.dpr, 10),
      cores: str(body?.cores, 10),
      memory: str(body?.memory, 10),
      connection: str(body?.connection, 20),
      touch: str(body?.touch, 6),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
