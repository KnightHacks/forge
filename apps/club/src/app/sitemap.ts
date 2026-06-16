import type { MetadataRoute } from "next";

import { RESOURCE_ARTICLES } from "./resources/resource-data";
import {
  absoluteUrl,
  CANONICAL_ROUTES,
  RESOURCE_LIBRARY_UPDATED_AT,
  SITE_LAST_MODIFIED,
} from "./seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pageLastModified = new Date(`${SITE_LAST_MODIFIED}T00:00:00-04:00`);
  const resourceRoutes = RESOURCE_ARTICLES.map((article) => ({
    route: `/resources/${article.slug}`,
    lastModified: new Date(
      `${article.updatedAt ?? RESOURCE_LIBRARY_UPDATED_AT}T00:00:00-04:00`,
    ),
  }));

  return [
    ...CANONICAL_ROUTES.map((route) => ({
      route,
      lastModified: pageLastModified,
    })),
    ...resourceRoutes,
  ].map(({ route, lastModified }) => ({
    url: absoluteUrl(route),
    lastModified,
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
