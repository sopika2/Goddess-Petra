"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";

type FormState = Omit<
  SiteSettings,
  "bioLines" | "adsSlots" | "wheelSegments" | "chatQuickReplies" | "tributePresets"
> & {
  bioText: string;
  adsSlotsText: string;
  wheelSegmentsText: string;
  chatQuickRepliesText: string;
  tributePresetsText: string;
};

// Ad embed blocks are edited as one textarea, blocks split by a line of "===".
const SLOT_SEP = /\n?^===$\n?/m;
function splitSlots(text: string): string[] {
  return text
    .split(SLOT_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initial,
    bioText: initial.bioLines.join("\n"),
    adsSlotsText: initial.adsSlots.join("\n===\n"),
    wheelSegmentsText: initial.wheelSegments.join("\n"),
    chatQuickRepliesText: initial.chatQuickReplies.join("\n"),
    tributePresetsText: initial.tributePresets.join("\n"),
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const {
      bioText,
      adsSlotsText,
      wheelSegmentsText,
      chatQuickRepliesText,
      tributePresetsText,
      ...rest
    } = form;
    const payload = {
      ...rest,
      bioLines: bioText.split("\n").map((l) => l.trim()).filter(Boolean),
      adsSlots: splitSlots(adsSlotsText),
      wheelSegments: wheelSegmentsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      chatQuickReplies: chatQuickRepliesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      tributePresets: tributePresetsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Save failed.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-8">
      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">identity</h2>
        <Field
          label="Site name"
          hint="Used in the page title, footer and image alt. (The ransom wordmark is styled in code.)"
          value={form.siteName}
          onChange={set("siteName")}
        />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">home — bio</h2>
        <div>
          <label className="label">Bio lines (one per line)</label>
          <textarea
            className="input min-h-[120px] resize-y font-mono text-xs"
            value={form.bioText}
            onChange={(e) => setForm((f) => ({ ...f, bioText: e.target.value }))}
          />
          <p className="mt-1 text-xs text-muted">
            Wrap text in [[double brackets]] to redact it, e.g.{" "}
            <code>too extreme for [[most people]] apparently</code>. Visual only
            — the text is still in the page source, so don&apos;t hide real
            secrets with it.
          </p>
        </div>
        <Field label="Tagline" value={form.tagline} onChange={set("tagline")} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">throne</h2>
        <Field label="Kicker" value={form.throneKicker} onChange={set("throneKicker")} />
        <Field label="Heading" value={form.throneHeading} onChange={set("throneHeading")} />
        <Field label="Note" value={form.throneNote} onChange={set("throneNote")} />
        <Field label="Stamp" value={form.throneStamp} onChange={set("throneStamp")} />
        <Field label="Button label" value={form.throneButton} onChange={set("throneButton")} />
        <Field
          label="DM-fee callout"
          hint="Small note by the Throne button (an arrow points at it) telling visitors the DM fee is paid on your Throne. Leave blank to hide it."
          value={form.dmFeeNote}
          onChange={set("dmFeeNote")}
        />
        <Field label="Throne URL" value={form.throneUrl} onChange={set("throneUrl")} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">exposed wall</h2>
        <Field label="Heading" value={form.wallHeading} onChange={set("wallHeading")} />
        <Field label="Subtitle" value={form.wallSub} onChange={set("wallSub")} />
        <Field label="Empty message" value={form.wallEmpty} onChange={set("wallEmpty")} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">ads / money page</h2>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={form.feedEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, feedEnabled: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">
            <strong className="text-white">Show the FEED ME button + ad page.</strong>{" "}
            Turn this off to remove it from the site entirely (the button
            disappears and <code>/feed</code> redirects home). Turn it back on
            when you have a good ad network.
          </span>
        </label>
        <Field
          label="Nav button label"
          hint="The button shown on the home page that leads to the ad page."
          value={form.adsNavLabel}
          onChange={set("adsNavLabel")}
        />
        <Field label="Heading" value={form.adsHeading} onChange={set("adsHeading")} />
        <Field label="Subtitle" value={form.adsSub} onChange={set("adsSub")} />
        <Field label="Note" value={form.adsNote} onChange={set("adsNote")} />
        <div>
          <label className="label">Ad embed blocks</label>
          <textarea
            className="input min-h-[160px] resize-y font-mono text-xs"
            value={form.adsSlotsText}
            onChange={(e) =>
              setForm((f) => ({ ...f, adsSlotsText: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            Paste the ad code from your ad network (one block per slot). Separate
            slots with a line containing only <code>===</code>. Leave empty to
            show placeholder slots. Note: regular Google AdSense bans adult
            content — use an adult-friendly network (ExoClick, JuicyAds,
            TrafficJunky, etc.). Scripts run on the page, so only paste code from
            networks you trust.
          </p>
        </div>
        <div>
          <label className="label">Feed-page ad code (popunder / social bar)</label>
          <textarea
            className="input min-h-[120px] resize-y font-mono text-xs"
            value={form.adsFeedScript}
            onChange={(e) =>
              setForm((f) => ({ ...f, adsFeedScript: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            For formats with no banner of their own — paste your Adsterra{" "}
            <strong>popunder</strong> (or social-bar) code here. It runs on the{" "}
            <code>/feed</code> page only and fires when a visitor clicks (the
            GROVEL button counts). Don&apos;t put popunder code in a banner slot
            above.
          </p>
        </div>
        <div>
          <label className="label">Popunder cooldown (seconds)</label>
          <input
            type="number"
            min={5}
            className="input max-w-[10rem]"
            value={form.adsFeedCooldownSeconds}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                adsFeedCooldownSeconds: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            The countdown shown next to the GROVEL button. Set it to match your
            ExoClick popunder capping (e.g. <code>60</code> for &quot;1 every 1
            minute&quot;), so &quot;ready&quot; appears exactly when the next pop
            can fire.
          </p>
        </div>
        <div>
          <label className="label">Feed-page &lt;head&gt; code (Client Hints)</label>
          <textarea
            className="input min-h-[90px] resize-y font-mono text-xs"
            value={form.adsFeedHead}
            onChange={(e) =>
              setForm((f) => ({ ...f, adsFeedHead: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            Paste ExoClick&apos;s <strong>Client Hints meta tag</strong> (the{" "}
            <code>&lt;meta http-equiv=&quot;Delegate-CH&quot;…&gt;</code>) — it
            goes in the <code>&lt;head&gt;</code> of <code>/feed</code> and
            improves ad targeting. One tag covers all your ExoClick zones.
          </p>
        </div>
        <div>
          <label className="label">ads.txt</label>
          <textarea
            className="input min-h-[100px] resize-y font-mono text-xs"
            value={form.adsTxt}
            onChange={(e) => setForm((f) => ({ ...f, adsTxt: e.target.value }))}
          />
          <p className="mt-1 text-xs text-muted">
            Served at <code>/ads.txt</code>. Paste the exact line(s) your ad
            network gives you (e.g.{" "}
            <code>example.com, 12345, DIRECT, abc123</code>) — required before
            most networks will pay out.
          </p>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">games / wheel</h2>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={form.gamesEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, gamesEnabled: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">
            <strong className="text-white">Show the games button + /games page.</strong>{" "}
            Visitors must sign in with X to play; every roll is logged under
            Admin → Games.
          </span>
        </label>
        <Field label="Nav button label" value={form.gamesNavLabel} onChange={set("gamesNavLabel")} />
        <Field label="Heading" value={form.gamesHeading} onChange={set("gamesHeading")} />
        <Field label="Subtitle" value={form.gamesSub} onChange={set("gamesSub")} />
        <Field label="Note" value={form.gamesNote} onChange={set("gamesNote")} />
        <div>
          <label className="label">Wheel segments (one per line)</label>
          <textarea
            className="input min-h-[120px] resize-y font-mono text-xs"
            value={form.wheelSegmentsText}
            onChange={(e) =>
              setForm((f) => ({ ...f, wheelSegmentsText: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            The Throne gifts/tributes a spin can land on — one per line. Keep them
            short so they fit the wheel. Landing on one sends the loser to your
            Throne to pay it.
          </p>
        </div>
        <Field
          label="Force EVERY spin to (exact segment)"
          hint="Leave blank for random. Type a segment exactly to rig all spins to land there. Per-account rigging (with a count) is on the Games page."
          value={form.wheelForced}
          onChange={set("wheelForced")}
        />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">chat / dm</h2>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={form.chatEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, chatEnabled: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">
            <strong className="text-white">Show the &quot;message me&quot; button + /chat page.</strong>{" "}
            Visitors must sign in with X to message you; you read &amp; reply from
            Admin → Inbox.
          </span>
        </label>
        <Field label="Nav button label" value={form.chatNavLabel} onChange={set("chatNavLabel")} />
        <Field label="Heading" value={form.chatHeading} onChange={set("chatHeading")} />
        <Field label="Subtitle" value={form.chatSub} onChange={set("chatSub")} />
        <Field label="Note" value={form.chatNote} onChange={set("chatNote")} />

        <div>
          <label className="label">Quick replies (one per line)</label>
          <textarea
            className="input min-h-[80px] resize-y font-mono text-xs"
            value={form.chatQuickRepliesText}
            onChange={(e) =>
              setForm((f) => ({ ...f, chatQuickRepliesText: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            One-tap reply chips in your Inbox composer.
          </p>
        </div>
        <div>
          <label className="label">Tribute presets (one per line)</label>
          <textarea
            className="input min-h-[140px] resize-y font-mono text-xs"
            value={form.tributePresetsText}
            onChange={(e) =>
              setForm((f) => ({ ...f, tributePresetsText: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            One-tap amount chips for the ♛ tribute sticker in your Inbox. Format{" "}
            <code>label|https://throne.com/...</code> — e.g.{" "}
            <code>$50|https://throne.com/goddess_petra-x3/item/…</code>. Tapping
            a chip fills the demand + link; the sub sees a &quot;pay up&quot;
            card straight to that Throne item.
          </p>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">phone access &amp; notifications</h2>
        <Field
          label="Secret login key"
          hint={
            form.secretLoginKey.trim().length >= 12
              ? `Bookmark this on your phone: <your site>/gate/${form.secretLoginKey.trim()} — opening it signs you straight in. Anyone with the link IS you, so keep it private.`
              : "Opening <your site>/gate/<key> signs you straight in — made for your phone. Needs 12+ characters; use something long and random (anyone with the link IS you). Blank = off."
          }
          value={form.secretLoginKey}
          onChange={set("secretLoginKey")}
        />
        <p className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-muted">
          <strong className="text-white">Phone notifications:</strong> open your
          secret login link on your phone, go to <code>Admin → Inbox</code> and
          tap <strong>🔔 notify this device</strong>. You&apos;ll get a push the
          moment a sub messages. Subs get the same button on{" "}
          <code>/chat</code> for your replies. (iPhone needs the site added to
          the Home Screen first; Android works right away.)
        </p>
        <Field
          label="Telegram bot token (optional backup)"
          hint="Create a bot with @BotFather on Telegram and paste its token. Blank = off."
          value={form.telegramBotToken}
          onChange={set("telegramBotToken")}
        />
        <Field
          label="Telegram chat id"
          hint="Your own chat id (ask @userinfobot). The bot pings you when a sub messages."
          value={form.telegramChatId}
          onChange={set("telegramChatId")}
        />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">confessions</h2>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={form.confessionsEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, confessionsEnabled: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">
            <strong className="text-white">Show the &quot;confess&quot; button + /confessions wall.</strong>{" "}
            Visitors sign in with X to confess; confessions post{" "}
            <strong>anonymously only after you approve them</strong> in Admin →
            Confessions (where you always see who really sent each one).
          </span>
        </label>
        <Field label="Nav button label" value={form.confessNavLabel} onChange={set("confessNavLabel")} />
        <Field label="Heading" value={form.confessHeading} onChange={set("confessHeading")} />
        <Field label="Subtitle" value={form.confessSub} onChange={set("confessSub")} />
        <Field label="Note" value={form.confessNote} onChange={set("confessNote")} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">search engines</h2>
        <div>
          <label className="label">Verification meta tags</label>
          <textarea
            className="input min-h-[100px] resize-y font-mono text-xs"
            value={form.verificationTags}
            onChange={(e) =>
              setForm((f) => ({ ...f, verificationTags: e.target.value }))
            }
          />
          <p className="mt-1 text-xs text-muted">
            Paste the <code>&lt;meta&gt;</code> verification tag(s) from Google
            Search Console, Bing, etc. — one per line. They&apos;re added to the
            site&apos;s <code>&lt;head&gt;</code> so you can verify ownership.
            Leave existing ones in place so you stay verified.
          </p>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="hud text-accent">footer &amp; contact</h2>
        <Field label="Threat line" value={form.footerThreat} onChange={set("footerThreat")} />
        <Field
          label="Contact email"
          hint="Public email for removal / DMCA / business requests. Shown in the footer and on the legal pages (2257, DMCA, privacy, terms)."
          value={form.contactEmail}
          onChange={set("contactEmail")}
        />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved ? <span className="hud text-accent">saved ✓</span> : null}
        {error ? <span className="text-sm text-blood">{error}</span> : null}
      </div>
    </form>
  );
}
