import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import PetPen from "@/components/pets/PetPen";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "The Pet Pen",
  description: "Claim your number.",
  alternates: { canonical: "/pets" },
};

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  const s = await getSettings();
  if (!s.petsEnabled) redirect("/");

  return (
    <main className="min-h-screen">
      <div className="tape h-3" />

      <header className="relative mx-auto max-w-2xl px-6 py-10 text-center">
        <Link href="/" className="hud absolute left-6 top-6 hover:text-accent-soft">
          ◂ back to file
        </Link>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">
          {s.petsHeading}
        </h1>
        <p className="mt-3 font-hand text-2xl text-accent-soft">{s.petsSub}</p>
        {s.petsNote ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {s.petsNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-2xl px-6 py-10">
        <PetPen />
      </section>

      <SiteFooter />
    </main>
  );
}
