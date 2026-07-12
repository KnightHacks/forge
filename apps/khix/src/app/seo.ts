export const SITE_URL = "https://2026.knighthacks.org";
export const SEO_TITLE = "Knight Hacks IX";
export const SEO_DESCRIPTION =
  "Knight Hacks IX is UCF's annual student hackathon for building, learning, and creating together.";
export const OG_IMAGE_URL = "https://assets.knighthacks.org/khix/og-image.webp";
export const OG_IMAGE_ALT =
  "Knight Hacks IX at the University of Central Florida";

export const SEO_KEYWORDS = [
  "Knight Hacks IX",
  "Knight Hacks 2026",
  "UCF hackathon",
  "Florida hackathon",
  "Orlando hackathon",
  "student hackathon",
  "36 hour hackathon",
  "University of Central Florida hackathon",
];

export const KHIX_SOCIAL_URLS = [
  "https://www.instagram.com/knighthacks/",
  "https://www.linkedin.com/company/knight-hacks",
  "https://github.com/KnightHacks",
  "https://discord.knighthacks.org/",
];

export const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: SEO_TITLE,
  description: SEO_DESCRIPTION,
  url: SITE_URL,
  image: OG_IMAGE_URL,
  startDate: "2026-10-09",
  endDate: "2026-10-11",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  keywords: SEO_KEYWORDS.join(", "),
  location: {
    "@type": "Place",
    name: "University of Central Florida",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orlando",
      addressRegion: "FL",
      addressCountry: "US",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Knight Hacks",
    url: "https://knighthacks.org",
    sameAs: KHIX_SOCIAL_URLS,
  },
  offers: {
    "@type": "Offer",
    url: `${SITE_URL}/apply`,
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};
