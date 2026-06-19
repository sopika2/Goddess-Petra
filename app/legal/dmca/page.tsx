import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "DMCA & Content Removal",
  description: "How to request removal of content or report copyright infringement.",
  alternates: { canonical: "/legal/dmca" },
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
        DMCA &amp; Content Removal
      </h1>
      <p className="hud mt-2">last updated · June 19, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        {s.siteName} respects the rights of others and responds to valid notices
        of copyright infringement (under the U.S. DMCA and the EU DSA) and to
        requests to remove personal content. Our designated contact is {mail}.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">
        Request removal of content about you
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        If you are featured on this Site and want your content taken down — for
        any reason — email {mail} with a link to the page and a way to confirm
        your identity. We will remove verified requests promptly, no questions
        asked.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">
        Copyright infringement notice
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        To report material that infringes your copyright, send a written notice
        to {mail} that includes:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-relaxed text-muted">
        <li>Identification of the copyrighted work claimed to be infringed.</li>
        <li>The exact URL(s) of the material you want removed.</li>
        <li>Your contact information (name, email, address).</li>
        <li>
          A statement that you have a good-faith belief the use is not authorized
          by the owner, its agent, or the law.
        </li>
        <li>
          A statement, under penalty of perjury, that the information is accurate
          and that you are the owner or authorized to act on the owner&apos;s
          behalf.
        </li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Valid notices are actioned promptly. Submitting a knowingly false claim
        may carry legal liability.
      </p>
    </>
  );
}
