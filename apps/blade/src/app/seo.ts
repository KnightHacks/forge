export const SITE_URL = "https://blade.knighthacks.org";
export const SITE_NAME = "Blade by Knight Hacks";

export const SEO_TITLE = "Blade | Knight Hacks Member Platform";
export const SEO_DESCRIPTION =
  "Blade is the Knight Hacks member platform for managing membership, events, dues, profiles, forms, and club operations at the University of Central Florida.";

export const SEO_KEYWORDS = [
  "Blade by Knight Hacks",
  "Knight Hacks member platform",
  "Knight Hacks membership",
  "Knight Hacks member dashboard",
  "Knight Hacks events",
  "Knight Hacks UCF",
  "UCF software engineering club",
  "UCF student organization",
];

export const OG_IMAGE_URL = `${SITE_URL}/blade-social-card.png`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  "Blade, the Knight Hacks member platform at the University of Central Florida";

export const bladeJsonLd = {
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
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#application`,
      name: SITE_NAME,
      alternateName: "Blade",
      url: SITE_URL,
      description: SEO_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      image: OG_IMAGE_URL,
      publisher: {
        "@id": "https://knighthacks.org/#organization",
      },
      inLanguage: "en-US",
    },
  ],
};
