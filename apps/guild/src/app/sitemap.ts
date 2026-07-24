import type { MetadataRoute } from "next";

import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profiles, companies] = await Promise.all([
    api.guild.getSitemapProfiles(),
    api.guild.listPublicCompanies(),
  ]);

  return [
    {
      url: "https://guild.knighthacks.org",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://guild.knighthacks.org/companies",
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://guild.knighthacks.org/globe",
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...companies.map((company) => ({
      url: `https://guild.knighthacks.org/companies/${company.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...profiles.map((profile) => ({
      url: `https://guild.knighthacks.org/members/${profile.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
