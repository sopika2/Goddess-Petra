import type { Metadata } from "next";
import { headers } from "next/headers";
import { Archivo_Black, Special_Elite, Caveat, Inter } from "next/font/google";
import "./globals.css";
import AgeGate from "@/components/AgeGate";
import VisitLogger from "@/components/VisitLogger";
import { getSettings } from "@/lib/settings";
import { isIpBlocked, isXBlocked } from "@/lib/blocks";
import { clientIp } from "@/lib/ip";
import { readUserSession } from "@/lib/usersession";

/** True when this request's IP or signed-in X account is banned. Fails open —
 *  a DB hiccup must never wall off the whole site. */
async function requestIsBanned(): Promise<boolean> {
  try {
    const h = await headers();
    const user = await readUserSession();
    const [ipBad, xBad] = await Promise.all([
      isIpBlocked(clientIp(h)),
      user ? isXBlocked(user.id) : Promise.resolve(false),
    ]);
    return ipBad || xBad;
  } catch {
    return false;
  }
}

// Display = heavy grotesque for the ransom-note wordmark + headings.
const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
// Typewriter = the "case file" / surveillance voice (labels, HUD, buttons).
const typewriter = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-typewriter",
  display: "swap",
});
// Hand = the bratty handwritten voice (short asides only).
const hand = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hand",
  display: "swap",
});
// Body = clean legible text for everything that must stay readable.
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Goddess Petra";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description = `The official site of ${siteName} — 18+ findomme & brat. Tributes, the Exposed Wall, and more.`;

// Pull name/content out of any pasted <meta ...> verification tags so Next can
// render them into <head>.
function parseMetaTags(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of raw.match(/<meta[^>]*>/gi) || []) {
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (name && content) out[name] = content;
  }
  return out;
}

export async function generateMetadata(): Promise<Metadata> {
  let verify: Record<string, string> = {};
  try {
    verify = parseMetaTags((await getSettings()).verificationTags || "");
  } catch {
    verify = {};
  }
  return { ...baseMetadata, other: { ...baseMetadata.other, ...verify } };
}

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description,
  applicationName: siteName,
  // Maximize indexing + archiving (admin/api are excluded via robots.txt).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description,
    url: "/",
    images: ["/goddess-petra.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
    images: ["/goddess-petra.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const banned = await requestIsBanned();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${typewriter.variable} ${hand.variable} ${body.variable}`}
    >
      <body className="min-h-screen">
        {banned ? (
          // Banned IP / account: no site, no age gate, no tracking beacon —
          // just a dead end. Everything else in the tree is skipped.
          <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <p className="font-typewriter text-xs uppercase tracking-[0.3em] text-blood">
              access revoked
            </p>
            <h1 className="mt-4 font-display text-4xl uppercase text-white sm:text-5xl">
              you&apos;ve been filed away
            </h1>
            <p className="mt-4 font-hand text-2xl text-accent-soft">
              don&apos;t come back ♡
            </p>
          </main>
        ) : (
          <>
        {/* Runs before paint: if already 18+-verified, mark the doc so the age
            gate is hidden instantly (no flash) via CSS. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('gp_age_verified')==='1'){document.documentElement.setAttribute('data-age','ok')}}catch(e){}",
          }}
        />
        <noscript>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              textAlign: "center",
              background: "#0b0a0d",
              color: "#fff",
              fontFamily: "sans-serif",
            }}
          >
            This site requires JavaScript to continue.
          </div>
        </noscript>
        <AgeGate />
        <VisitLogger />
        {children}
          </>
        )}
      </body>
    </html>
  );
}
