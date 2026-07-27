import type { MetadataRoute } from "next";

import { api } from "~/trpc/server";
import { SITE_URL } from "./seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profiles, companies] = await Promise.all([
    api.guild.getSitemapProfiles(),
    api.guild.listPublicCompanies(),
  ]);

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/companies`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/globe`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...companies.map((company) => ({
      url: `${SITE_URL}/companies/${company.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...profiles.map((profile) => ({
      url: `${SITE_URL}/members/${profile.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
