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
  /** Quick-reply chips in the admin inbox composer. */
  chatQuickReplies: string[];
  /** Tribute-sticker presets for the ♛ composer, one per line as
   *  "label|https://throne.com/..." — each becomes a one-tap amount chip. */
  tributePresets: string[];
  /** Telegram bot pings when a sub messages. Blank = off.
   *  Create a bot via @BotFather; get your chat id from @userinfobot. */
  telegramBotToken: string;
  telegramChatId: string;
  /** Web-push VAPID keypair — auto-generated on first use, do not edit. */
  vapidPublicKey: string;
  vapidPrivateKey: string;
  /** Confessions master switch (shows the "confess" button + /confessions when
   *  on). Visitors sign in with X; confessions post anonymously after you
   *  approve them in Admin → Confessions. */
  confessionsEnabled: boolean;
  confessNavLabel: string;
  confessHeading: string;
  confessSub: string;
  confessNote: string;
  /** The Lounge — a public live chat room the whole site shares. Everyone can
   *  read; signed-in X visitors can post; you moderate. Master switch. */
  loungeEnabled: boolean;
  loungeNavLabel: string;
  loungeHeading: string;
  loungeSub: string;
  loungeNote: string;
  /** A pinned announcement shown at the top of the Lounge. Blank = none. */
  loungePinned: string;
  /** The Board — a Twitter-style timeline of the goddess's own posts, shown on
   *  the home page. Post text, pictures/video, a link button, and polls. */
  boardEnabled: boolean;
  boardHeading: string;
  boardSub: string;
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
  chatQuickReplies: ["pay first ♡", "beg better.", "cute. now tribute :3"],
  tributePresets: [
    "$5|https://throne.com/goddess_petra-x3/item/33afc218-a676-456f-ade4-526caa7d241f",
    "$10|https://throne.com/goddess_petra-x3/item/2bc200a6-e267-4213-9c92-114fd3f0c6b0",
    "$30|https://throne.com/goddess_petra-x3/item/55475f9d-7087-4d54-b4ca-191c090cd552",
    "$50|https://throne.com/goddess_petra-x3/item/ce72a0b2-10e9-4e96-9b00-a596a4462d53",
    "$100|https://throne.com/goddess_petra-x3/item/cd863dce-d101-4cfc-85dc-1301b4a9f7b2",
    "$300|https://throne.com/goddess_petra-x3/item/4005f713-745c-49ad-824e-79dcff6bb80c",
    "$500|https://throne.com/goddess_petra-x3/item/fdc124bc-34e1-42a5-9d00-b0691ed2b9ce",
  ],
  telegramBotToken: "",
  telegramChatId: "",
  vapidPublicKey: "",
  vapidPrivateKey: "",
  confessionsEnabled: false,
  confessNavLabel: "confess ▸",
  confessHeading: "Confess to me",
  confessSub: "spill it. i decide what the world gets to see ♡",
  confessNote:
    "posted anonymously — but only if i approve it, and i always know it was you :3",
  loungeEnabled: false,
  loungeNavLabel: "the lounge ▸",
  loungeHeading: "The Lounge",
  loungeSub: "grovel in public, losers. everyone's watching ♡",
  loungeNote:
    "one room, everyone sees it. sign in with X to talk — behave, or i wipe you :3",
  loungePinned: "",
  boardEnabled: false,
  boardHeading: "The Board",
  boardSub: "my word is law. read it ♡",
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
  if (patch.chatQuickReplies && Array.isArray(patch.chatQuickReplies)) {
    next.chatQuickReplies = patch.chatQuickReplies
      .map((s) => String(s))
      .filter((s) => s.trim().length > 0);
  }
  if (patch.tributePresets && Array.isArray(patch.tributePresets)) {
    next.tributePresets = patch.tributePresets
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
