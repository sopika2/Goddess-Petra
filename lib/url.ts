import "server-only";

/**
 * Build an absolute URL for an in-app redirect.
 *
 * Behind the Cloudflare tunnel the app listens on 0.0.0.0:3001, and req.url can
 * carry that internal address — so redirecting with `new URL(path, req.url)`
 * sends the browser to http://0.0.0.0:3001/... (ERR_ADDRESS_INVALID). We instead
 * anchor redirects to NEXT_PUBLIC_SITE_URL (the real public domain) when set,
 * falling back to req.url for local/dev where it isn't configured.
 */
export function appUrl(path: string, req: Request): URL {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(path, base);
    } catch {
      /* fall through to req.url */
    }
  }
  return new URL(path, req.url);
}
