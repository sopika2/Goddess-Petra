/**
 * Pure helpers safe to import from both server and client code.
 */

/**
 * Normalize anything the operator types for a Twitter/X handle into a bare
 * username (no @, no URL). Accepts "@name", "name", or a full x.com/twitter.com
 * URL. X usernames are at most 15 chars: letters, digits, underscore.
 */
export function sanitizeHandle(input: string): string {
  if (!input) return "";
  let s = input.trim();
  s = s.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
  s = s.replace(/^@+/, "");
  s = s.split(/[/?#\s]/)[0];
  s = s.replace(/[^A-Za-z0-9_]/g, "");
  return s.slice(0, 15);
}

/** True if a media URL points at a video we serve (mp4/webm), so renderers can
 *  branch to a <video> element instead of <img>. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)$/i.test(url || "");
}

/** Render a pet's required X display name, e.g. "Goddess Petra's pet #7". */
export function petDisplayName(template: string, n: number): string {
  return (template || "").replace(/\{n\}/g, String(n)).slice(0, 120);
}

/**
 * Does a pet's live X display name carry the name they were told to wear?
 * Lenient on purpose — X trims oddly and people wrap it in emoji — so we look
 * for the expected name inside theirs rather than demanding equality. The
 * trailing-digit guard stops pet #7 passing with "…pet #70".
 */
export function petNameMatches(live: string, expected: string): boolean {
  const l = (live || "").toLowerCase();
  const want = (expected || "").toLowerCase().trim();
  if (!want) return false;
  const at = l.indexOf(want);
  if (at < 0) return false;
  return !/[0-9]/.test(l.charAt(at + want.length));
}
