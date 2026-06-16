import type { Metadata } from "next";

import type { HackathonHistoryEntry } from "./hackathon-history";
import JsonLd from "../_components/json-ld";
import { CLUB_ASSETS } from "../_lib/assets";
import { createBreadcrumbJsonLd, createPageMetadata, SITE_URL } from "../seo";
import HackathonHistory from "./hackathon-history";

export const metadata: Metadata = createPageMetadata({
  title: "Hackathon History",
  description:
    "Explore the Knight Hacks hackathon and hackday archive, including past UCF event dates, participant counts, project submissions, and event links.",
  path: "/hackathons",
});

const hackathons: readonly HackathonHistoryEntry[] = [
  {
    name: "Knight Hacks IX",
    date: "Oct 9 - 11, 2026",
    kind: "hackathon",
    primaryMetric: {
      value: 36,
      label: "Hours",
    },
    secondaryMetric: {
      value: "2027",
      label: "Season",
    },
    siteUrl: "https://2026.knighthacks.org/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksIX,
    imageAlt: "Knight Hacks IX event artwork",
    caption: "The forest remembers",
    accent: "#86efac",
    hoverTheme: "ix",
  },
  {
    name: "BloomKnights",
    date: "July 11, 2026",
    kind: "hackday",
    primaryMetric: {
      value: 12,
      label: "Hours",
    },
    secondaryMetric: {
      value: "BA1",
      label: "UCF",
    },
    siteUrl: "https://bloom.knighthacks.org/",
    imageSrc: CLUB_ASSETS.hackathonBloomKnights,
    imageAlt: "BloomKnights 2026, a 12-hour UCF hackathon in Orlando, Florida",
    caption: "Beginner-friendly hackday",
    accent: "#86efac",
    hoverTheme: "bloom",
  },
  {
    name: "Knight Hacks VIII",
    date: "Oct 24 - 26, 2025",
    kind: "hackathon",
    primaryMetric: {
      value: "1000+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "180+",
      label: "Projects",
    },
    projects: 180,
    siteUrl: "https://knighthacksviii.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksVIII,
    imageAlt: "Attendees watching a presentation at Knight Hacks VIII",
    caption: "The biggest Knight Hacks yet",
    accent: "#ffb62b",
  },
  {
    name: "GemiKnights",
    date: "June 28, 2025",
    kind: "hackday",
    primaryMetric: {
      value: "200+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "60+",
      label: "Projects",
    },
    siteUrl: "https://gemi.knighthacks.org/",
    imageSrc: CLUB_ASSETS.hackathonGemiKnights,
    imageAlt: "Students checking in and gathering at GemiKnights",
    caption: "First summer hackday",
    accent: "#7dd3fc",
  },
  {
    name: "Knight Hacks VII",
    date: "Oct 4 - 6, 2024",
    kind: "hackathon",
    primaryMetric: {
      value: "400+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "90+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-vii.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksVII,
    imageAlt: "Knight Hacks VII attendees posing with the UCF mascot",
    caption: "Community built weekend",
    accent: "#f74f83",
  },
  {
    name: "Knight Hacks VI",
    date: "Oct 6 - 8, 2023",
    kind: "hackathon",
    primaryMetric: {
      value: "400+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "95+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-vi.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksVI,
    imageAlt: "Students seated for a Knight Hacks VI event session",
    caption: "Builds made for demo day",
    accent: "#7dd3fc",
  },
  {
    name: "Morgan & Morgan Hackathon",
    displayName: "Morgan & Morgan",
    date: "Apr 28 - 30, 2023",
    kind: "hackathon",
    primaryMetric: {
      value: "$20K",
      label: "Prizes",
    },
    secondaryMetric: {
      value: 3,
      label: "Days",
    },
    siteUrl: "https://www.instagram.com/p/CrWp5bYv1UH/",
    siteLabel: "View Event Post",
    imageSrc: CLUB_ASSETS.hackathonMorganAndMorgan,
    imageAlt: "Students presenting at the Morgan and Morgan hackathon",
    caption: "Morgan & Morgan build weekend",
    accent: "#fb7185",
  },
  {
    name: "Hack-A-Day II",
    date: "Apr 15, 2023",
    kind: "hackday",
    primaryMetric: {
      value: 1,
      label: "Day",
    },
    secondaryMetric: {
      value: "2nd",
      label: "Run",
    },
    siteUrl: "https://www.instagram.com/knighthacks/",
    siteLabel: "View Knight Hacks",
    imageSrc: CLUB_ASSETS.hackathonHackADayII,
    imageAlt: "Hack-A-Day II project winners posing after presentations",
    caption: "One-day build sprint",
    accent: "#86efac",
  },
  {
    name: "Hack-A-Day I",
    date: "Feb 4, 2023",
    kind: "hackday",
    primaryMetric: {
      value: 1,
      label: "Day",
    },
    secondaryMetric: {
      value: "First",
      label: "Run",
    },
    siteUrl: "https://www.instagram.com/p/CoIk-_YPl1_/",
    siteLabel: "View Event Post",
    imageSrc: CLUB_ASSETS.hackathonHackADayI,
    imageAlt: "Hack-A-Day I attendees posing together",
    caption: "Hack-A-Day begins",
    accent: "#f4ca41",
  },
  {
    name: "Knight Hacks V",
    date: "Nov 12 - 14, 2021",
    kind: "hackathon",
    primaryMetric: {
      value: "200+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "55+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-2021.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksV,
    imageAlt: "Knight Hacks V virtual event artwork",
    caption: "Virtual season build weekend",
    accent: "#f4ca41",
  },
  {
    name: "Knight Hacks IV",
    date: "Oct 9 - 11, 2020",
    kind: "hackathon",
    primaryMetric: {
      value: "200+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "60+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-2020-online.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksIV,
    imageAlt: "Knight Hacks IV virtual event artwork",
    caption: "First virtual Knight Hacks",
    accent: "#fb7185",
  },
  {
    name: "Knight Hacks III",
    date: "Mar 1 - 3, 2019",
    kind: "hackathon",
    primaryMetric: {
      value: "200+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "75+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-2019.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksIII,
    imageAlt: "Knight Hacks III attendees gathered in an auditorium",
    caption: "Early archive energy",
    accent: "#c084fc",
  },
  {
    name: "Knight Hacks II",
    date: "Oct 7 - 8, 2017",
    kind: "hackathon",
    primaryMetric: {
      value: "150+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "55+",
      label: "Projects",
    },
    siteUrl: "https://knight-hacks-2017.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksII,
    imageAlt: "Students working together at Knight Hacks II",
    caption: "The archive grows",
    accent: "#fb7185",
  },
  {
    name: "Knight Hacks I",
    date: "Jan 15 - 16, 2016",
    kind: "hackathon",
    primaryMetric: {
      value: "70+",
      label: "Hackers",
    },
    secondaryMetric: {
      value: "30+",
      label: "Projects",
    },
    siteUrl: "https://knighthacks.devpost.com/",
    imageSrc: CLUB_ASSETS.hackathonKnightHacksI,
    imageAlt: "The original Knight Hacks event space",
    caption: "Where the run started",
    accent: "#34d399",
  },
];

const hackathonArchiveJsonLd = [
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Hackathons", path: "/hackathons" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Knight Hacks Hackathon History",
    url: `${SITE_URL}/hackathons`,
    description:
      "Archive of Knight Hacks hackathons and hackdays at the University of Central Florida.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: hackathons.map((hackathon, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: hackathon.name,
        url: hackathon.siteUrl,
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Event type",
            value: hackathon.kind === "hackday" ? "Hackday" : "Hackathon",
          },
          {
            "@type": "PropertyValue",
            name: "Date",
            value: hackathon.date,
          },
          ...(typeof hackathon.participants === "number"
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Participants",
                  value: hackathon.participants,
                },
              ]
            : []),
          ...(typeof hackathon.projects === "number"
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Project submissions",
                  value: hackathon.projects,
                },
              ]
            : []),
        ],
      })),
    },
  },
];

export default function HackathonsPage() {
  return (
    <>
      <JsonLd data={hackathonArchiveJsonLd} />
      <HackathonHistory hackathons={hackathons} />
    </>
  );
}
