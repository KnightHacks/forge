export const SITE_URL = "https://2026.knighthacks.org";
export const EVENT_NAME = "Knight Hacks IX";
export const EVENT_DATE_LABEL = "October 9-11, 2026";
export const EVENT_START_DATE = "2026-10-09";
export const EVENT_END_DATE = "2026-10-11";
export const ORGANIZER_NAME = "Knight Hacks";
export const ORGANIZER_URL = "https://knighthacks.org";
export const CONTACT_EMAIL = "hack@knighthacks.org";
export const APPLICATION_URL = "https://blade.knighthacks.org/";
export const SPONSOR_URL = "https://blade.knighthacks.org/sponsor";
export const DISCORD_URL = "https://discord.knighthacks.org/";
export const INSTAGRAM_URL = "https://www.instagram.com/knighthacks/";
export const FACEBOOK_URL = "https://www.facebook.com/KnightHacks/";
export const TWITTER_URL = "https://www.twitter.com/KnightHacks/";
export const LINKTREE_URL = "https://linktr.ee/knighthacks";

export const SEO_TITLE =
  "Knight Hacks IX | 36-Hour UCF Hackathon in Orlando, Florida";

export const SEO_DESCRIPTION =
  "Knight Hacks IX is a 36-hour in-person hackathon hosted by Knight Hacks at the University of Central Florida from October 9-11, 2026. Build projects with teams of up to four, attend workshops, meet mentors, join social events, and compete for prizes in Orlando, Florida.";

export const OG_IMAGE_URL = "https://assets.knighthacks.org/IXSEO.webp";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  "Knight Hacks IX, a 36-hour UCF hackathon in Orlando, Florida";

export const SEO_KEYWORDS = [
  "Knight Hacks IX",
  "Knight Hacks",
  "UCF hackathon",
  "University of Central Florida hackathon",
  "Orlando hackathon",
  "Florida hackathon",
  "student hackathon Florida",
  "college hackathon",
  "beginner friendly hackathon",
  "36 hour hackathon",
  "MLH hackathon",
  "coding competition Orlando",
  "student tech event Orlando",
  "hackathon workshops",
  "hackathon prizes",
  "hackathon mentors",
];

export const SOCIAL_PROFILE_URLS = [
  DISCORD_URL,
  INSTAGRAM_URL,
  FACEBOOK_URL,
  TWITTER_URL,
  LINKTREE_URL,
];

export const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: EVENT_NAME,
  alternateName: "KH IX",
  description: SEO_DESCRIPTION,
  url: SITE_URL,
  image: OG_IMAGE_URL,
  startDate: EVENT_START_DATE,
  endDate: EVENT_END_DATE,
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
    name: ORGANIZER_NAME,
    url: ORGANIZER_URL,
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_PROFILE_URLS,
  },
  offers: {
    "@type": "Offer",
    url: APPLICATION_URL,
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};
