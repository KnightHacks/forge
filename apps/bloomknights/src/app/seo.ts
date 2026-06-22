export const SITE_URL = "https://bloom.knighthacks.org";
export const EVENT_NAME = "BloomKnights";
export const EVENT_DATE_LABEL = "July 11, 2026";
export const EVENT_START_DATE = "2026-07-11T09:00:00-04:00";
export const EVENT_END_DATE = "2026-07-11T21:00:00-04:00";
export const DISCORD_URL = "https://discord.gg/TPYGbdgyaQ";

export const SEO_TITLE =
  "BloomKnights 2026 | 12-Hour UCF Hackathon in Orlando, Florida";

export const SEO_DESCRIPTION =
  "BloomKnights is a 12-hour beginner-friendly hackathon hosted by Knight Hacks at the University of Central Florida in Orlando. Join university students on July 11, 2026 for coding, workshops, mentorship, prizes, and project building.";

export const OG_IMAGE_URL =
  "https://assets.knighthacks.org/EventBannerBloom.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  "BloomKnights 2026, a 12-hour UCF hackathon in Orlando, Florida";

export const SEO_KEYWORDS = [
  "BloomKnights",
  "UCF hackathon",
  "Florida hackathon",
  "Orlando hackathon",
  "student hackathon Florida",
  "beginner friendly hackathon",
  "12 hour hackathon",
  "coding event UCF",
  "Knight Hacks events",
  "mini hackathon UCF",
];

export const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: EVENT_NAME,
  description:
    "BloomKnights is a 12-hour student hackathon hosted by Knight Hacks at the University of Central Florida in Orlando, Florida. Participants build projects, attend workshops, learn new skills, meet mentors, and collaborate with other university students.",
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
    name: "Knight Hacks",
    url: "https://knighthacks.org",
  },
  offers: {
    "@type": "Offer",
    url: SITE_URL,
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};
