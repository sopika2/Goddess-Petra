import "server-only";
import { db } from "./database";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** True only for http(s) URLs — used to keep javascript:/data: out of hrefs. */
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface SiteSettings {
  siteName: string;
  /** Bio lines on the home hero. Wrap text in [[double brackets]] to redact it. */
  bioLines: string[];
  tagline: string;
  throneUrl: string;
  throneKicker: string;
  throneHeading: string;
  throneNote: string;
  throneStamp: string;
  throneButton: string;
  wallHeading: string;
  wallSub: string;
  wallEmpty: string;
  footerThreat: string;
  /** Master switch for the ad/money page: shows the FEED ME button + /feed when
   *  on; hides the button and makes /feed redirect home when off. */
  feedEnabled: boolean;
  /** Label for the nav button that leads to the ad/money page. */
  adsNavLabel: string;
  adsHeading: string;
  adsSub: string;
  adsNote: string;
  /** Ad embed blocks (raw HTML/script from an ad network). One per slot. */
  adsSlots: string[];
  /** Page-level ad code (popunder / social-bar / smartlink) that runs on the
   *  /feed money page only — never on the landing page or the rest of the site. */
  adsFeedScript: string;
  /** Contents served at /ads.txt (the line(s) your ad network gives you). */
  adsTxt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Goddess Petra",
  bioLines: [
    "18 year old brat",
    "too extreme for [[most people]] apparently",
    "findomme ^^",
    "professional ball kicker & student :p",
  ],
  tagline: "get worse for me :3",
  throneUrl: "https://throne.com/goddess_petra-x3",
  throneKicker: "Tribute",
  throneHeading: "The Throne ♛",
  throneNote: "pay up — it gets filed either way <3",
  throneStamp: "Owned",
  throneButton: "Tribute the Throne ↗",
  wallHeading: "The Exposed Wall",
  wallSub: "you're on the list now ♡",
  wallEmpty: "no one's been brave enough… give it time :3",
  footerThreat: "I know what you did",
  feedEnabled: false,
  adsNavLabel: "feed me ▸",
  adsHeading: "Pay with your eyes",
  adsSub: "every ad you stare at pays me. keep scrolling, good boy ♡",
  adsNote:
    "you don't get to touch. you get to look — and looking costs you. that's the whole point :3",
  adsSlots: [],
  adsFeedScript: "",
  adsTxt: "",
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    const pool = await db();
    const [rows] = await pool.query("SELECT data FROM settings WHERE id = 1");
    const r = (rows as any[])[0];
    if (!r || !r.data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(r.data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(
  patch: Partial<SiteSettings>,
): Promise<SiteSettings> {
  const current = await getSettings();
  const next: SiteSettings = { ...current, ...patch };
  if (patch.bioLines && Array.isArray(patch.bioLines)) {
    next.bioLines = patch.bioLines
      .map((l) => String(l))
      .filter((l) => l.trim().length > 0);
  }
  if (patch.adsSlots && Array.isArray(patch.adsSlots)) {
    next.adsSlots = patch.adsSlots
      .map((s) => String(s))
      .filter((s) => s.trim().length > 0);
  }
  // Never persist a non-http(s) throne URL (blocks javascript:/data: hrefs).
  if (patch.throneUrl !== undefined && !isSafeUrl(next.throneUrl)) {
    next.throneUrl = current.throneUrl;
  }
  const pool = await db();
  await pool.query(
    "INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
    [JSON.stringify(next)],
  );
  return next;
}
