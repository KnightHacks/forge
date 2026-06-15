import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import JsonLd from "../_components/json-ld";
import { createBreadcrumbJsonLd, createPageMetadata, SITE_URL } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Hackathon History",
  description:
    "Explore the Knight Hacks hackathon archive, including past UCF hackathon dates, participant counts, project submissions, and Devpost links.",
  path: "/hackathons",
});

const hackathons = [
  {
    name: "Knight Hacks VIII",
    date: "Oct 24 - 26, 2025",
    participants: 641,
    projects: 188,
    siteUrl: "https://knighthacksviii.devpost.com/",
  },
  {
    name: "Knight Hacks VII",
    date: "Oct 4 - 6, 2024",
    participants: 310,
    projects: 93,
    siteUrl: "https://knight-hacks-vii.devpost.com/",
  },
  {
    name: "Knight Hacks VI",
    date: "Oct 6 - 8, 2023",
    participants: 323,
    projects: 99,
    siteUrl: "https://knight-hacks-vi.devpost.com/",
  },
  {
    name: "Knight Hacks IV",
    date: "Nov 12 - 14, 2021",
    participants: 180,
    projects: 57,
    siteUrl: "https://knight-hacks-2021.devpost.com/",
  },
  {
    name: "Knight Hacks III",
    date: "Mar 1 - 3, 2019",
    participants: 192,
    projects: 78,
    siteUrl: "https://knight-hacks-2019.devpost.com/",
  },
  {
    name: "Knight Hacks II",
    date: "Oct 7 - 8, 2017",
    participants: 141,
    projects: 56,
    siteUrl: "https://knight-hacks-2017.devpost.com/",
  },
  {
    name: "Knight Hacks I",
    date: "Jan 15 - 16, 2016",
    participants: 75,
    projects: 34,
    siteUrl: "https://knight-hacks.devpost.com/",
  },
] as const;

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
      "Archive of past Knight Hacks hackathons at the University of Central Florida.",
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
            name: "Date",
            value: hackathon.date,
          },
          {
            "@type": "PropertyValue",
            name: "Participants",
            value: hackathon.participants,
          },
          {
            "@type": "PropertyValue",
            name: "Project submissions",
            value: hackathon.projects,
          },
        ],
      })),
    },
  },
];

const timelineRows = [
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 692.225341796875,
    cardWidth: 636.91552734375,
    cardHeight: 575.094482421875,
    detailsX: 921.5,
    detailsY: 865.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 1367.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 152,
    detailsY: 1540.12,
  },
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 2042.2255859375,
    cardWidth: 636.91552734375,
    cardHeight: 575.093994140625,
    detailsX: 921.5,
    detailsY: 2215.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 2706.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.490478515625,
    detailsX: 153,
    detailsY: 2879.12,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 3335.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
    detailsY: 3508.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 4009.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 153,
    detailsY: 4182.12,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 4684.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
    detailsY: 4857.12,
  },
] as const;

function HackathonDetails({
  x,
  y,
  hackathon,
}: {
  x: number;
  y: number;
  hackathon: (typeof hackathons)[number];
}) {
  return (
    <div
      className="club-history-details absolute h-[204px] w-[440px]"
      style={{ left: x, top: y }}
      data-reveal={x > 700 ? "right" : "left"}
    >
      <div className="absolute left-0 top-0 flex flex-col items-start gap-2">
        <div className="-rotate-2 bg-[#de2868] px-3 py-1">
          <p className="text-[24px] font-black uppercase leading-[43.2px] tracking-[-0.18px] text-white">
            {hackathon.date}
          </p>
        </div>
        <div className="rotate-1 border-b-4 border-[#f4ca41]">
          <h2 className="whitespace-nowrap text-[48px] font-black uppercase leading-[43.2px] tracking-[-2.0484px] text-white">
            {hackathon.name}
          </h2>
        </div>
      </div>

      <Link
        href={hackathon.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="club-history-link absolute top-[137px] flex h-12 w-[308px] items-center justify-center border-2 border-white bg-transparent text-center text-[14px] font-bold uppercase leading-[21px] tracking-[0.3992px] text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
      >
        View Hackathon Site{" "}
        <span aria-hidden="true" className="pl-2 text-[18px]">
          →
        </span>
      </Link>
    </div>
  );
}

function Timeline() {
  return (
    <Image
      src="/hackathons/figma-timeline-extended.png"
      alt=""
      width={37}
      height={4910}
      className="absolute left-[738px] top-[705px] h-[4910px] w-[37px]"
      data-reveal="photo"
    />
  );
}

export default function HackathonsPage() {
  return (
    <main className="relative min-h-screen overflow-x-auto bg-[#110214] font-sans text-white">
      <JsonLd data={hackathonArchiveJsonLd} />
      <div
        className="club-page-hero absolute inset-x-0 top-0 h-[980px] overflow-hidden"
        data-hero
      >
        <Image
          src="/hackathons/kh-history-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_46%] brightness-[0.76] contrast-[1.06] saturate-[1.08]"
          data-hero-media
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,0,14,0.22)_0%,rgba(11,0,14,0.12)_40%,rgba(11,0,14,0.62)_70%,rgba(11,0,14,0.94)_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,0,14,0.64)_0%,rgba(11,0,14,0.06)_30%,rgba(17,2,20,0.38)_72%,#110214_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_34%_48%,rgba(255,182,43,0.12)_0%,rgba(247,79,131,0.08)_28%,transparent_58%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#110214]"
          data-hero-overlay
        />
      </div>

      <section className="relative z-10 mx-auto h-[5620px] w-[1498px] overflow-hidden bg-transparent">
        <div
          className="absolute left-1/2 top-[170px] z-20 flex w-[1060px] -translate-x-1/2 flex-col items-center text-center"
          data-hero-content
          data-stagger
        >
          <div className="mb-6 flex items-center gap-5 text-[13px] font-black uppercase tracking-[0.18em] text-[#f4ca41]">
            <span className="text-white [text-shadow:3px_3px_0_rgba(0,0,0,0.45)]">
              2016-2025
            </span>
            <span className="h-px w-16 bg-[#f4ca41]" aria-hidden="true" />
            <span>Seven hackathons</span>
          </div>
          <h1
            aria-label="Knight Hacks History"
            className="text-[96px] font-black uppercase leading-none tracking-normal text-white [text-shadow:7px_7px_0_rgba(0,0,0,0.48)]"
            data-reveal="headline"
          >
            <span className="club-line">
              <span className="whitespace-nowrap">Knight Hacks</span>
            </span>
            <span className="club-line">
              <span className="whitespace-nowrap">History</span>
            </span>
          </h1>
          <p className="text-white/86 mt-7 max-w-[650px] text-[21px] font-bold leading-[34px]">
            Past Knight Hacks events, project counts, and Devpost links from
            UCF&apos;s student-built hackathons.
          </p>
          <Link
            href="#history-timeline"
            className="club-button mt-10 inline-flex bg-[#f4ca41] px-8 text-black shadow-[5px_5px_0_rgba(255,255,255,0.85)]"
          >
            Enter The Timeline
            <span aria-hidden="true" className="pl-2 text-[18px]">
              ↓
            </span>
          </Link>
        </div>

        <div
          id="history-timeline"
          className="absolute left-0 top-[640px] h-px w-px"
        />

        <Timeline />

        {timelineRows.map((row, index) => {
          const hackathon = hackathons[index];

          if (!hackathon) {
            return null;
          }

          return (
            <div key={`${row.side}-${row.cardY}`}>
              <p className="sr-only">
                {hackathon.name} was held {hackathon.date} with{" "}
                {hackathon.participants} participants and {hackathon.projects}{" "}
                project submissions.
              </p>
              <Image
                src={`/hackathons/figma-card-real-${index}.png`}
                alt=""
                width={Math.round(row.cardWidth)}
                height={Math.round(row.cardHeight)}
                className="club-history-card absolute"
                sizes={`${Math.ceil(row.cardWidth)}px`}
                data-reveal="photo"
                style={{
                  left: row.cardX,
                  top: row.cardY,
                  width: row.cardWidth,
                  height: row.cardHeight,
                }}
              />
              <HackathonDetails
                x={row.detailsX}
                y={row.detailsY}
                hackathon={hackathon}
              />
            </div>
          );
        })}
      </section>
    </main>
  );
}
