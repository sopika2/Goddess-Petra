import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/db";
import Gallery from "@/components/Gallery";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const description =
    (profile.info || `${profile.name} — exposed on the Wall.`)
      .replace(/\s+/g, " ")
      .slice(0, 160);
  const images = profile.thumbnail ? [profile.thumbnail] : ["/goddess-petra.jpg"];
  return {
    title: profile.name,
    description,
    alternates: { canonical: `/exposed/${profile.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      title: profile.name,
      description,
      url: `/exposed/${profile.slug}`,
      images,
    },
    twitter: { card: "summary_large_image", title: profile.name, description, images },
  };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();

  // Structured data so each exposed person is a searchable entity.
  const abs = (p: string) => {
    try {
      return new URL(p, siteUrl).toString();
    } catch {
      return p;
    }
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/exposed/${profile.slug}`,
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      ...(profile.thumbnail ? { image: abs(profile.thumbnail) } : {}),
      ...(profile.info
        ? { description: profile.info.replace(/\s+/g, " ").slice(0, 300) }
        : {}),
      ...(profile.twitter
        ? { sameAs: [`https://x.com/${profile.twitter}`] }
        : {}),
    },
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 lg:max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="py-10">
        <Link
          href="/exposed"
          className="hud hover:text-accent-soft"
        >
          ← The Exposed Wall
        </Link>
      </header>

      <section className="flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-8 sm:text-left">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-2 shadow-glow sm:h-36 sm:w-36 lg:h-44 lg:w-44">
          {profile.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.thumbnail}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-4xl uppercase sm:text-5xl lg:text-6xl">
            {profile.name}
          </h1>
          {profile.tagline ? (
            <p className="mt-2 font-hand text-2xl text-accent-soft">
              {profile.tagline}
            </p>
          ) : null}
          {profile.twitter ? (
            <a
              href={`https://x.com/${profile.twitter}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-typewriter text-sm text-muted hover:text-accent-soft"
            >
              @{profile.twitter} on X ↗
            </a>
          ) : null}
        </div>
      </section>

      {profile.info ? (
        <section className="mt-10">
          <h2 className="hud mb-3 text-accent">Info</h2>
          <p className="max-w-3xl whitespace-pre-line leading-relaxed text-white/90">
            {profile.info}
          </p>
        </section>
      ) : null}

      <section className="mt-12 flex-1">
        <h2 className="hud mb-4 text-accent">Gallery</h2>
        <Gallery images={profile.gallery} name={profile.name} />
      </section>

      <SiteFooter />
    </main>
  );
}
