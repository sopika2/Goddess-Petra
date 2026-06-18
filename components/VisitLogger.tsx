"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires a beacon to /api/track on each page view so the server can record the
 * visit (IP/UA/path/time) plus the extra info the browser exposes (language,
 * timezone, screen/viewport, platform). Skips the admin area.
 */
export default function VisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    let screenStr = "";
    let viewport = "";
    let tz = "";
    let lang = "";
    let platform = "";
    let dpr = "";
    let cores = "";
    let memory = "";
    let connection = "";
    let touch = "";
    try {
      const nav = navigator as unknown as {
        userAgentData?: { platform?: string };
        deviceMemory?: number;
        hardwareConcurrency?: number;
        maxTouchPoints?: number;
        connection?: { effectiveType?: string };
      };
      screenStr = `${window.screen.width}x${window.screen.height}`;
      viewport = `${window.innerWidth}x${window.innerHeight}`;
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      lang = navigator.language || "";
      platform = nav.userAgentData?.platform || navigator.platform || "";
      dpr = String(window.devicePixelRatio || "");
      cores = nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : "";
      memory = nav.deviceMemory ? String(nav.deviceMemory) : "";
      connection = nav.connection?.effectiveType || "";
      touch = (nav.maxTouchPoints || 0) > 0 ? "yes" : "no";
    } catch {
      /* best effort */
    }

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referer: document.referrer,
        screen: screenStr,
        viewport,
        tz,
        lang,
        platform,
        dpr,
        cores,
        memory,
        connection,
        touch,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
