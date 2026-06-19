import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data this site collects and how it is used.",
  alternates: { canonical: "/legal/privacy" },
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
        Privacy Policy
      </h1>
      <p className="hud mt-2">last updated · June 19, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        This policy explains what {s.siteName} (&quot;we&quot;) collects when you
        visit. By using the Site you consent to it. Questions: {mail}.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">What we collect</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-relaxed text-muted">
        <li>
          <strong className="text-white">Visit data:</strong> your IP address,
          the pages you view, the time, the referring page, and technical details
          your browser reports — browser, operating system, device type,
          language, timezone, screen and window size, and similar signals.
        </li>
        <li>
          <strong className="text-white">Sign-in data:</strong> if you choose
          &quot;Sign in with X,&quot; we receive and store your public X profile
          (account ID, handle, display name, avatar, bio, location, website,
          verified status, account age, and follower/following/post counts) and
          associate it with your IP address.
        </li>
        <li>
          <strong className="text-white">Cookies / local storage:</strong> for
          the 18+ confirmation, login sessions, and ad-frequency control.
        </li>
      </ul>

      <h2 className="mt-8 font-display text-xl text-white">How we use it</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        To operate and secure the Site, understand and analyze traffic, keep you
        signed in, and prevent abuse. We do not sell your personal data.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">Advertising</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Some pages display third-party ads. Ad networks may set their own cookies
        and receive device/browser information to deliver and cap ads, under
        their own privacy policies, which we do not control.
      </p>

      <h2 className="mt-8 font-display text-xl text-white">Your choices</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You can browse without signing in, clear cookies in your browser, and
        request access to or deletion of data we hold about you by emailing{" "}
        {mail}. We honor verified requests where required by applicable law (e.g.
        GDPR / CCPA).
      </p>

      <h2 className="mt-8 font-display text-xl text-white">Retention</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        We keep logs only as long as needed for the purposes above or as required
        by law, then delete them.
      </p>
    </>
  );
}
