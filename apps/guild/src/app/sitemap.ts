import type { MetadataRoute } from "next";

import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await api.guild.getSitemapProfiles();

  return [
    {
      url: "https://guild.knighthacks.org",
      changeFrequency: "daily",
      priority: 1,
    },
    ...profiles.map((profile) => ({
      url: `https://guild.knighthacks.org/members/${profile.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
