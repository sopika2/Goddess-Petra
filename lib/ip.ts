import "server-only";

/**
 * Client IP from request headers.
 *
 * SECURITY: header-based client IPs are forgeable. By default we trust ONLY
 * x-forwarded-for, which the bundled server.mjs sets authoritatively from the
 * real socket address (and strips any inbound copy). Browsers cannot set
 * x-forwarded-for via fetch (it's a forbidden header), so under server.mjs the
 * logged IP can't be spoofed by a visitor.
 *
 * If you actually run behind a trusted L7 proxy / CDN (nginx, Cloudflare),
 * set TRUST_PROXY_HEADERS=1: we then honor cf-connecting-ip and take the LAST
 * x-forwarded-for entry (the one your proxy appended), not the client-spoofable
 * first one.
 */
function clamp(s: string): string {
  let v = s.trim();
  // Normalize so the same client isn't logged under two strings.
  if (v.startsWith("::ffff:")) v = v.slice(7); // IPv4-mapped IPv6 → plain IPv4
  if (v === "::1") v = "127.0.0.1"; // IPv6 loopback → IPv4 loopback
  return v.slice(0, 64);
}

export function clientIp(headers: Headers): string {
  if (process.env.TRUST_PROXY_HEADERS === "1") {
    const cf = headers.get("cf-connecting-ip");
    if (cf) return clamp(cf);
    const xff = headers.get("x-forwarded-for");
    if (xff) {
      const parts = xff.split(",");
      return clamp(parts[parts.length - 1]); // proxy-appended = trustworthy
    }
    const xr = headers.get("x-real-ip");
    if (xr) return clamp(xr);
    return "unknown";
  }

  // Default (bundled server / self-host): trust only the value server.mjs set.
  const xff = headers.get("x-forwarded-for");
  if (xff) return clamp(xff.split(",")[0]);
  return "unknown";
}
