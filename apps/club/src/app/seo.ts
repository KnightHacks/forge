import type { Metadata } from "next";

import {
  ORGANIZATION_NAME,
  ORGANIZER_EMAIL,
  PUBLIC_LINKS,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILE_URLS,
} from "./_lib/site-config";

export {
  CANONICAL_ROUTES,
  ORGANIZATION_NAME,
  ORGANIZER_EMAIL,
  PRESIDENT_EMAIL,
  PUBLIC_LINKS,
  SITE_LAST_MODIFIED,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILE_URLS,
} from "./_lib/site-config";

export const BLADE_URL = PUBLIC_LINKS.blade;
export const CODE_OF_CONDUCT_URL = PUBLIC_LINKS.codeOfConduct;
export const DISCORD_URL = PUBLIC_LINKS.discord;
export const INSTAGRAM_URL = PUBLIC_LINKS.instagram;
export const LINKEDIN_URL = PUBLIC_LINKS.linkedin;
export const GITHUB_URL = PUBLIC_LINKS.github;
export const LINKTREE_URL = PUBLIC_LINKS.linktree;
export const X_URL = PUBLIC_LINKS.x;

export const SEO_TITLE =
  "Knight Hacks | UCF Software Engineering Club and Hackathon";

export const SEO_DESCRIPTION =
  "Knight Hacks is UCF's student-run software engineering club, nonprofit, and annual hackathon community for builders, designers, hackers, and early technologists in Orlando, Florida.";

export const OG_IMAGE_URL = `${SITE_URL}/hero/club-hero-poster.webp`;
export const OG_IMAGE_WIDTH = 1280;
export const OG_IMAGE_HEIGHT = 720;
export const OG_IMAGE_ALT =
  "Knight Hacks students building together at the University of Central Florida";

export const SEO_KEYWORDS = [
  "Knight Hacks",
  "UCF software engineering club",
  "UCF computer science club",
  "University of Central Florida hackathon",
  "UCF hackathon",
  "Orlando hackathon",
  "Florida hackathon",
  "student tech organization",
  "student software organization",
  "coding workshops UCF",
  "hackathon mentorship",
  "student project showcase",
  "college coding club",
];

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  image = OG_IMAGE_URL,
  imageAlt = OG_IMAGE_ALT,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
  };
}

export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: ORGANIZATION_NAME,
      alternateName: ["Knight Hacks at UCF", "Knight Hacks Club"],
      url: SITE_URL,
      logo: `${SITE_URL}/sigilKH.svg`,
      image: OG_IMAGE_URL,
      foundingDate: "2015",
      email: ORGANIZER_EMAIL,
      sameAs: SOCIAL_PROFILE_URLS,
      description: SEO_DESCRIPTION,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Orlando",
        addressRegion: "FL",
        addressCountry: "US",
      },
      areaServed: [
        {
          "@type": "Place",
          name: "University of Central Florida",
        },
        {
          "@type": "City",
          name: "Orlando",
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SEO_DESCRIPTION,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-US",
    },
  ],
};

export function createBreadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function createWebPageJsonLd({
  path,
  name,
  description,
}: {
  path: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    about: {
      "@id": `${SITE_URL}/#organization`,
    },
    inLanguage: "en-US",
  };
}
