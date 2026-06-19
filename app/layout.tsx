import type { Metadata } from "next";
import { Archivo_Black, Special_Elite, Caveat, Inter } from "next/font/google";
import "./globals.css";
import AgeGate from "@/components/AgeGate";
import VisitLogger from "@/components/VisitLogger";
import { getSettings } from "@/lib/settings";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${typewriter.variable} ${hand.variable} ${body.variable}`}
    >
      <body className="min-h-screen">
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
      </body>
    </html>
  );
}
