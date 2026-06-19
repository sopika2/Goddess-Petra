"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";

type FormState = Omit<SiteSettings, "bioLines" | "adsSlots"> & {
  bioText: string;
  adsSlotsText: string;
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
    const { bioText, adsSlotsText, ...rest } = form;
    const payload = {
      ...rest,
      bioLines: bioText.split("\n").map((l) => l.trim()).filter(Boolean),
      adsSlots: splitSlots(adsSlotsText),
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
        <h2 className="hud text-accent">footer</h2>
        <Field label="Threat line" value={form.footerThreat} onChange={set("footerThreat")} />
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
