import type { MetadataRoute } from "next";

import { SITE_URL } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-05-30T00:00:00-04:00"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
