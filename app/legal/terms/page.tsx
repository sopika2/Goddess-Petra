import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using this site.",
  alternates: { canonical: "/legal/terms" },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSettings();
  const mail = (
    <a
      href={`mailto:${s.contactEmail}`}
      className="text-accent-soft underline hover:text-accent"
    >
      {s.contactEmail}
    </a>
  );
  return (
    <>
      <h1 className="mt-6 font-display text-3xl uppercase text-white">
        Terms of Service
      </h1>
      <p className="hud mt-2">last updated · June 19, 2026</p>

      <h2 className="mt-8 font-display text-xl text-white">18+ only</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This Site contains adult content. By entering you confirm you are at
        least 18 years old (or the age of majority where you live) and that
        viewing adult material is legal in your location.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">Acceptable use</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Don&apos;t use the Site unlawfully, attempt to disrupt or breach it,
        scrape it, or harass anyone featured on it. We may restrict access at our
        discretion.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">
        Tributes &amp; payments
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Any tributes, gifts, or payments are voluntary, for entertainment, and{" "}
        <strong className="text-white">non-refundable</strong>. Nothing on this
        Site is investment, financial, or professional advice, and no specific
        outcome is promised.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">
        Featured individuals &amp; removal
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Individuals featured on the Site appear with their consent and are 18 or
        older. Anyone may request removal — see our{" "}
        <a
          href="/legal/dmca"
          className="text-accent-soft underline hover:text-accent"
        >
          DMCA &amp; Content Removal
        </a>{" "}
        policy.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">
        Intellectual property
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Content on the Site is owned by {s.siteName} or its licensors. Don&apos;t
        copy, redistribute, or republish it without permission.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">No warranty</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The Site is provided &quot;as is,&quot; without warranties of any kind. To
        the fullest extent permitted by law, we are not liable for any damages
        arising from your use of the Site or third-party links and ads on it.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">Contact</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Questions about these terms: {mail}.
      </p>
    </>
  );
}
