import type { MetadataRoute } from "next";

import { absoluteUrl, CANONICAL_ROUTES, SITE_LAST_MODIFIED } from "./seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pageLastModified = new Date(`${SITE_LAST_MODIFIED}T00:00:00-04:00`);

  return CANONICAL_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified: pageLastModified,
    changeFrequency:
      route === "/" || route === "/events" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/events" ? 0.9 : 0.8,
  }));
}
