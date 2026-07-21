import type { MetadataRoute } from "next";

// Web app manifest — makes the site installable ("Add to Home Screen" / "Install
// app") so it gets its own icon and opens standalone, the closest a website can
// get to being a launch shortcut. (Browsers do not allow a site to set itself as
// the browser's homepage — that's a manual, per-browser setting.)
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_SITE_NAME || "Goddess Petra";
  return {
    name,
    short_name: name,
    description: `The official site of ${name}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a0d",
    theme_color: "#FF2E88",
    icons: [
      {
        src: "/goddess-petra.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/goddess-petra.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
