import type { MetadataRoute } from "next";
import { listProfiles } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Rebuilt on each request so new exposed profiles appear immediately.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let profiles: Awaited<ReturnType<typeof listProfiles>> = [];
  try {
    profiles = await listProfiles();
  } catch {
    profiles = [];
  }

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/exposed`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/feed`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...profiles.map((p) => ({
      url: `${siteUrl}/exposed/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
