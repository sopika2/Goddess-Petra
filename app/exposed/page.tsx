import Link from "next/link";
import type { Metadata } from "next";
import { listPublicProfiles } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ProfileBar from "@/components/ProfileBar";
import ProfileCard from "@/components/ProfileCard";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "The Exposed Wall",
  description: "The ones who paid to be seen — browse the Exposed Wall.",
  alternates: { canonical: "/exposed" },
  openGraph: {
    type: "website",
    title: "The Exposed Wall",
    description: "The ones who paid to be seen.",
    url: "/exposed",
    images: ["/goddess-petra.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function ExposedPage() {
  // Stay up (render the empty state) even if the DB is briefly unreachable —
  // this is a top indexed page, so it must not 500.
  let profiles: Awaited<ReturnType<typeof listPublicProfiles>> = [];
  try {
    profiles = await listPublicProfiles();
  } catch {
    profiles = [];
  }
  const s = await getSettings();

  return (
    <main className="min-h-screen">
      {/* ───────── MOBILE / TABLET: centered rows (unchanged) ───────── */}
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 lg:hidden">
        <header className="py-14 text-center">
          <Link href="/" className="hud hover:text-accent-soft">
            ◂ back to file
          </Link>
          <h1 className="mt-6 font-display text-4xl uppercase sm:text-5xl">
            {s.wallHeading}
          </h1>
          <p className="mt-3 font-hand text-2xl text-accent-soft">{s.wallSub}</p>
        </header>

        <div className="tape -mx-6 h-2" />

        <section className="flex-1 py-10">
          {profiles.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="hud text-muted">NO SUBJECTS LOGGED. YET.</p>
              <p className="mt-3 font-hand text-2xl text-accent-soft">
                {s.wallEmpty}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {profiles.map((p) => (
                <ProfileBar key={p.slug} profile={p} />
              ))}
            </div>
          )}
        </section>

        <SiteFooter />
      </div>

      {/* ───────── DESKTOP: evidence-board grid ───────── */}
      <div className="hidden min-h-screen flex-col lg:flex">
        <div className="tape h-3" />

        <header className="relative px-10 py-10 text-center xl:px-16">
          <Link
            href="/"
            className="hud absolute left-10 top-10 hover:text-accent-soft xl:left-16"
          >
            ◂ back to file
          </Link>
          <h1 className="font-display text-5xl uppercase xl:text-6xl">
            {s.wallHeading}
          </h1>
          <p className="mt-3 font-hand text-3xl text-accent-soft">{s.wallSub}</p>
        </header>

        <div className="tape h-3" />

        <section className="flex-1 px-10 py-12 xl:px-16">
          {profiles.length === 0 ? (
            <div className="card mx-auto max-w-xl p-12 text-center">
              <p className="hud text-muted">NO SUBJECTS LOGGED. YET.</p>
              <p className="mt-3 font-hand text-3xl text-accent-soft">
                {s.wallEmpty}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {profiles.map((p) => (
                <ProfileCard key={p.slug} profile={p} />
              ))}
            </div>
          )}
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
