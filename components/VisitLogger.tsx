"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// GPU model via WebGL — quite identifying ("ANGLE (NVIDIA GeForce ...)").
function getGpu(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ||
      c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg
      ? String(gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL) || "")
      : "";
  } catch {
    return "";
  }
}

// Stable-ish device fingerprint: hash of durable signals + a canvas render.
async function fingerprint(parts: string[]): Promise<string> {
  let canvas = "";
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(10, 10, 100, 30);
      ctx.fillStyle = "#069";
      ctx.fillText("gp-fp ♛😈", 12, 15);
      canvas = c.toDataURL();
    }
  } catch {
    /* ignore */
  }
  const raw = parts.join("|") + "|" + canvas;
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw),
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  } catch {
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }
}

/**
 * Fires a rich first-party beacon to /api/track on each page view: IP/UA/path
 * plus everything the browser exposes — language list, timezone, screen, GPU,
 * device class, network, high-entropy UA, storage, and a fingerprint hash.
 * No third-party lookups. Skips the admin area.
 */
export default function VisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    let cancelled = false;

    (async () => {
      const nav = navigator as any;
      const gpu = getGpu();
      let screenStr = "",
        viewport = "",
        tz = "",
        lang = "",
        platform = "",
        dpr = "",
        cores = "",
        memory = "",
        connection = "",
        touch = "",
        langs = "",
        colorDepth = "",
        orientation = "",
        dnt = "",
        cookies = "",
        netInfo = "",
        maxTouch = "",
        uaFull = "",
        storage = "";
      try {
        screenStr = `${window.screen.width}x${window.screen.height}`;
        viewport = `${window.innerWidth}x${window.innerHeight}`;
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        lang = navigator.language || "";
        langs = (navigator.languages || []).join(",");
        platform = nav.userAgentData?.platform || navigator.platform || "";
        dpr = String(window.devicePixelRatio || "");
        cores = nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : "";
        memory = nav.deviceMemory ? String(nav.deviceMemory) : "";
        connection = nav.connection?.effectiveType || "";
        const conn = nav.connection;
        netInfo = conn
          ? [
              conn.downlink ? `${conn.downlink}Mbps` : "",
              conn.rtt != null ? `${conn.rtt}ms` : "",
              conn.saveData ? "data-saver" : "",
            ]
              .filter(Boolean)
              .join(" ")
          : "";
        maxTouch = String(nav.maxTouchPoints ?? 0);
        touch = (nav.maxTouchPoints || 0) > 0 ? "yes" : "no";
        colorDepth = String(window.screen.colorDepth || "");
        orientation = window.screen.orientation?.type || "";
        dnt =
          navigator.doNotTrack ||
          nav.msDoNotTrack ||
          (window as any).doNotTrack ||
          "";
        cookies = navigator.cookieEnabled ? "yes" : "no";
      } catch {
        /* best effort */
      }
      try {
        if (nav.userAgentData?.getHighEntropyValues) {
          const hv = await nav.userAgentData.getHighEntropyValues([
            "model",
            "platformVersion",
            "architecture",
            "bitness",
          ]);
          uaFull = [
            hv.model,
            hv.platformVersion
              ? `${nav.userAgentData.platform} ${hv.platformVersion}`
              : "",
            [hv.architecture, hv.bitness].filter(Boolean).join("/"),
          ]
            .filter(Boolean)
            .join(" · ");
        }
      } catch {
        /* ignore */
      }
      try {
        const est = await navigator.storage?.estimate?.();
        if (est?.quota) storage = `${Math.round(est.quota / 1073741824)}GB`;
      } catch {
        /* ignore */
      }

      const fp = await fingerprint([
        navigator.userAgent,
        langs,
        tz,
        screenStr,
        colorDepth,
        platform,
        cores,
        memory,
        dpr,
        gpu,
      ]);

      if (cancelled) return;
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
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
          gpu,
          fp,
          langs,
          colorDepth,
          orientation,
          dnt,
          cookies,
          netInfo,
          maxTouch,
          uaFull,
          storage,
        }),
      }).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
