import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "18 U.S.C. 2257 Statement",
  description: "Records-keeping compliance statement.",
  alternates: { canonical: "/legal/2257" },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSettings();
  return (
    <>
      <h1 className="mt-6 font-display text-3xl uppercase text-white">
        18 U.S.C. § 2257 Compliance Statement
      </h1>
      <p className="hud mt-2">last updated · June 19, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        {s.siteName} (&quot;the Site&quot;) is committed to full compliance with
        18 U.S.C. § 2257 and § 2257A and the associated regulations (28 C.F.R.
        Part 75) to the extent they apply.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        All persons who appear in any visual depiction of actual or simulated
        sexually explicit conduct appearing on, or otherwise contained in, this
        Site were <strong className="text-white">over the age of eighteen (18)</strong>{" "}
        years at the time the depiction was created.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        With respect to any individual featured on the Site (including on the
        Exposed Wall), the operator obtains and retains age verification and
        documented consent prior to publication, and honors removal requests.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Records required to be maintained pursuant to 18 U.S.C. § 2257 are kept
        by the Custodian of Records and are available to authorized inspectors on
        request. To request information regarding these records, or to report a
        concern, contact the Custodian of Records at:
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white">
        Custodian of Records — {s.siteName}
        <br />
        <a
          href={`mailto:${s.contactEmail}`}
          className="text-accent-soft underline hover:text-accent"
        >
          {s.contactEmail}
        </a>
      </p>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Some content on this Site may be exempt from the requirements of 18
        U.S.C. § 2257 because it does not portray actual or simulated sexually
        explicit conduct as defined in 18 U.S.C. § 2256(2)(A)(i)–(iv). For all
        other content, the statement above applies.
      </p>
    </>
  );
}
