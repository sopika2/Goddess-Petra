export interface Profile {
  /** URL-safe identifier used in /exposed/[slug] */
  slug: string;
  /** Display name shown on the bar and profile page */
  name: string;
  /** Short tagline shown under the name on the list page (optional) */
  tagline: string;
  /** Their X / Twitter handle WITHOUT the leading @ (optional). Links to x.com/<handle>. */
  twitter: string;
  /** Path to the thumbnail image, e.g. /uploads/abc.jpg */
  thumbnail: string;
  /** Longer info / bio the person agreed to share. Plain text; newlines preserved. */
  info: string;
  /** Gallery image paths, e.g. ["/uploads/x.jpg", ...] */
  gallery: string[];
  /** Whether you have this person's consent on file. Required to publish. */
  consentOnFile: boolean;
  /** Hidden from the public wall + search + detail page. Still visible to the
   *  admin (in the dashboard and when previewing while logged in). */
  hidden: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

export type ProfileInput = Omit<Profile, "createdAt" | "updatedAt">;
