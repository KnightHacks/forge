import type { MetadataRoute } from "next";

import { RESOURCE_ARTICLES } from "./resources/resource-data";
import { CANONICAL_ROUTES, SITE_URL } from "./seo";

const LAST_MODIFIED = new Date("2026-06-11T00:00:00-04:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const resourceRoutes = RESOURCE_ARTICLES.map(
    (article) => `/resources/${article.slug}`,
  );

  return [...CANONICAL_ROUTES, ...resourceRoutes].map((route) => ({
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency:
      route === "/" || route === "/events" ? "weekly" : "monthly",
    priority:
      route === "/"
        ? 1
        : route === "/join" || route === "/events"
          ? 0.9
          : route.startsWith("/resources/")
            ? 0.65
            : 0.8,
  }));
}
