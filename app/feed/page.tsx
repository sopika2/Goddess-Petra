import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import FeedExperience from "@/components/FeedExperience";
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

export default async function FeedPage() {
  const s = await getSettings();

  return (
    <main className="min-h-screen">
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <FeedExperience slots={s.adsSlots} />
      </section>

      <div className="tape h-3" />

      <SiteFooter />
    </main>
  );
}
