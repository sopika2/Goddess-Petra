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
