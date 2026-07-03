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
  /** Small callout by the Throne button signalling the DM fee is paid there
   *  (an arrow points at the tribute button). Blank = hidden. */
  dmFeeNote: string;
  wallHeading: string;
  wallSub: string;
  wallEmpty: string;
  footerThreat: string;
  /** Public contact email for removal / DMCA / business requests. */
  contactEmail: string;
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
  /** Raw <meta> tags for the /feed page <head> (e.g. ExoClick Client Hints
   *  "Delegate-CH" tag) — improves ad targeting. */
  adsFeedHead: string;
  /** Seconds shown by the GROVEL cooldown timer — match your ExoClick popunder
   *  capping (e.g. 60 for "1 every 1 minute"). */
  adsFeedCooldownSeconds: number;
  /** Contents served at /ads.txt (the line(s) your ad network gives you). */
  adsTxt: string;
  /** Raw search-engine verification <meta> tags (Google/Bing/etc.), pasted as
   *  given. Rendered into the <head> on every page. */
  verificationTags: string;
  /** Games page master switch (shows the games button + /games when on). */
  gamesEnabled: boolean;
  gamesNavLabel: string;
  gamesHeading: string;
  gamesSub: string;
  gamesNote: string;
  /** Wheel segments — the Throne gifts/tributes a spin can land on. */
  wheelSegments: string[];
  /** Force EVERY spin to this segment (exact label; blank = off). Per-account
   *  rigging (with a per-account count) is managed on the admin Games page. */
  wheelForced: string;
  /** Chat/DM master switch (shows the "message me" button + /chat when on).
   *  Visitors must sign in with X; you reply from Admin → Inbox. */
  chatEnabled: boolean;
  chatNavLabel: string;
  chatHeading: string;
  chatSub: string;
  chatNote: string;
  /** Confessions master switch (shows the "confess" button + /confessions when
   *  on). Visitors sign in with X; confessions post anonymously after you
   *  approve them in Admin → Confessions. */
  confessionsEnabled: boolean;
  confessNavLabel: string;
  confessHeading: string;
  confessSub: string;
  confessNote: string;
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
  throneButton: "Pay up, loser ♡",
  dmFeeNote: "psst — my DMs aren't free. pay your fee here ♡",
  wallHeading: "The Exposed Wall",
  wallSub: "you're on the list now ♡",
  wallEmpty: "no one's been brave enough… give it time :3",
  footerThreat: "I know what you did",
  contactEmail: "petra@goddess-petra.info",
  feedEnabled: false,
  adsNavLabel: "feed me ▸",
  adsHeading: "Pay with your eyes",
  adsSub: "every ad you stare at pays me. keep scrolling, good boy ♡",
  adsNote:
    "you don't get to touch. you get to look — and looking costs you. that's the whole point :3",
  adsSlots: [],
  adsFeedScript: "",
  adsFeedHead: "",
  adsFeedCooldownSeconds: 3600,
  adsTxt: "",
  verificationTags:
    '<meta name="6a97888e-site-verification" content="4824922ed58595ceccc4ca8c0bcd5f06">',
  gamesEnabled: false,
  gamesNavLabel: "games ▸",
  gamesHeading: "Spin for me",
  gamesSub: "you can't win. you can only pay. spin, loser ♡",
  gamesNote:
    "every spin lands on a gift you owe me. the wheel decides — and i decide the wheel :3",
  wheelSegments: [
    "$5 tribute",
    "$10 tribute",
    "$20 tribute",
    "$50 tribute",
    "spoil me ☕",
    "drain — spin again",
  ],
  wheelForced: "",
  chatEnabled: false,
  chatNavLabel: "message me ▸",
  chatHeading: "Talk to me",
  chatSub: "say something, loser. i might even read it ♡",
  chatNote: "every word is logged to your file. choose them carefully :3",
  confessionsEnabled: false,
  confessNavLabel: "confess ▸",
  confessHeading: "Confess to me",
  confessSub: "spill it. i decide what the world gets to see ♡",
  confessNote:
    "posted anonymously — but only if i approve it, and i always know it was you :3",
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
  if (patch.wheelSegments && Array.isArray(patch.wheelSegments)) {
    next.wheelSegments = patch.wheelSegments
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
