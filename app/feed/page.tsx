import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import FeedExperience from "@/components/FeedExperience";
import AdScript from "@/components/AdScript";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Feed Me",
  description: "Waste your attention on me. Look — it costs you either way.",
  alternates: { canonical: "/feed" },
  openGraph: {
    type: "website",
    title: "Feed Me",
    description: "Waste your attention on me.",
    url: "/feed",
    images: ["/goddess-petra.jpg"],
  },
};

export const dynamic = "force-dynamic";

// Pull <meta> tags out of the pasted /feed head code so we can render them as
// real elements (React 19 hoists <meta> into <head>). Handles both name= and
// http-equiv= (ExoClick's Client Hints "Delegate-CH" tag uses http-equiv).
function parseHeadMetas(raw: string) {
  const metas: { httpEquiv?: string; name?: string; content: string }[] = [];
  for (const tag of raw.match(/<meta[^>]*>/gi) || []) {
    const httpEquiv = tag.match(/http-equiv=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (content && (httpEquiv || name)) metas.push({ httpEquiv, name, content });
  }
  return metas;
}

export default async function FeedPage() {
  const s = await getSettings();
  // When the ad page is switched off, it doesn't exist as far as visitors go.
  if (!s.feedEnabled) redirect("/");

  const headMetas = parseHeadMetas(s.adsFeedHead);
  // ExoClick's popunder code carries "idzone": <n>; the cooldown timer listens
  // for that zone's creativeDisplayed event to know when a pop actually fired.
  const popZoneId = s.adsFeedScript.match(/"idzone"\s*:\s*"?(\d+)"?/)?.[1] || "";

  return (
    <main className="min-h-screen">
      {headMetas.map((m, i) =>
        m.httpEquiv ? (
          <meta key={i} httpEquiv={m.httpEquiv} content={m.content} />
        ) : (
          <meta key={i} name={m.name} content={m.content} />
        ),
      )}
      <div className="tape h-3" />

      <header className="relative mx-auto max-w-6xl px-6 py-12 text-center lg:py-16">
        <Link
          href="/"
          className="hud absolute left-6 top-6 hover:text-accent-soft lg:top-8"
        >
          ◂ back to file
        </Link>
        <h1 className="font-display text-4xl uppercase sm:text-5xl lg:text-6xl">
          {s.adsHeading}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-hand text-2xl text-accent-soft lg:text-3xl">
          {s.adsSub}
        </p>
        {s.adsNote ? (
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
            {s.adsNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-6xl overflow-x-hidden px-6 py-10">
        <FeedExperience
          slots={s.adsSlots}
          popZoneId={popZoneId}
          cooldown={s.adsFeedCooldownSeconds}
        />
      </section>

      {/* Popunder / social-bar: runs on this page only, fires on clicks. */}
      <AdScript html={s.adsFeedScript} />

      <div className="tape h-3" />

      <SiteFooter />
    </main>
  );
}
