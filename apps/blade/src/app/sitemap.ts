import type { MetadataRoute } from "next";

import { SITE_URL } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: SITE_URL + "/sponsor",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
