import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep the admin area and API out of search/archives.
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: new URL(siteUrl).host,
  };
}
