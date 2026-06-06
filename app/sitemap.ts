import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl, citySlug } from "@/lib/site";

// Regenerate hourly. Lists the public marketing surface so search engines can
// discover every public listing (previously 100% orphaned).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const props = await prisma.property.findMany({
    where: { publicEnabled: true, publicSlug: { not: null } },
    select: { publicSlug: true, createdAt: true, lastRefreshedAt: true, city: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const now = new Date();
  const cities = Array.from(new Set(props.map((p) => p.city).filter(Boolean)));

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...cities.map((c) => ({
      url: `${siteUrl}/explore/${citySlug(c)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...props.map((p) => ({
      url: `${siteUrl}/p/${p.publicSlug}`,
      lastModified: p.lastRefreshedAt ?? p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
