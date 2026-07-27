import type { Metadata } from "next";

export const SITE_URL = "https://guild.knighthacks.org";
export const SITE_NAME = "Guild Collective";

export const SEO_TITLE = "Guild Collective | Knight Hacks";
export const SEO_DESCRIPTION =
  "The Guild Collective is Knight Hacks' directory for members and alumni at UCF. Browse profiles and see where people work or live.";

export const SEO_KEYWORDS = [
  "Knight Hacks Guild Collective",
  "Knight Hacks members",
  "Knight Hacks alumni",
  "UCF technology network",
  "UCF software engineering community",
  "UCF computer science alumni",
  "student technologists UCF",
  "Orlando technology community",
];

export const OG_IMAGE_URL = `${SITE_URL}/guild-social-card.png`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = "The Guild Collective logo on a dark background";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE_URL,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [
        {
          url: OG_IMAGE_URL,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
  };
}

export const guildJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://knighthacks.org/#organization",
      name: "Knight Hacks",
      url: "https://knighthacks.org",
      logo: `${SITE_URL}/knight-hacks-logo-black.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SEO_DESCRIPTION,
      publisher: {
        "@id": "https://knighthacks.org/#organization",
      },
      inLanguage: "en-US",
    },
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/#directory`,
      name: SEO_TITLE,
      url: SITE_URL,
      description: SEO_DESCRIPTION,
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
      about: {
        "@id": "https://knighthacks.org/#organization",
      },
      image: OG_IMAGE_URL,
      inLanguage: "en-US",
    },
  ],
};
