import type { Metadata } from "next";
import { ArrowUpRight, Instagram } from "lucide-react";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
import JsonLd from "../_components/json-ld";
import {
  BLADE_URL,
  createPageMetadata,
  createWebPageJsonLd,
  DISCORD_URL,
  INSTAGRAM_URL,
  SITE_URL,
} from "../seo";
import { EventsClient } from "./events-client";

const eventsEndpoint = new URL("/api/public/club-events", env.BLADE_URL);
eventsEndpoint.searchParams.set("limit", "48");

export const metadata: Metadata = createPageMetadata({
  title: "Events",
  description:
    "Explore upcoming Knight Hacks workshops, GBMs, socials, and sponsor events.",
  path: "/events",
});

const eventsPageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    createWebPageJsonLd({
      path: "/events",
      name: "Knight Hacks Events",
      description:
        "Upcoming Knight Hacks workshops, GBMs, socials, operations meetings, sponsor events, and build nights at UCF.",
    }),
    {
      "@type": "ItemList",
      name: "Knight Hacks event types",
      itemListElement: [
        "Weekly technical workshops",
        "General body meetings",
        "Operations meetings",
        "Sponsor events",
        "Social events",
        "Project nights",
      ].map((name, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
      })),
    },
    {
      "@type": "EventSeries",
      name: "Knight Hacks Club Events",
      url: `${SITE_URL}/events`,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      organizer: {
        "@id": `${SITE_URL}/#organization`,
      },
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
      offers: {
        "@type": "Offer",
        url: BLADE_URL,
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      sameAs: [DISCORD_URL, INSTAGRAM_URL],
    },
  ],
};

export default function EventsPage() {
  return (
    <main className="relative overflow-hidden bg-[linear-gradient(180deg,#120313_0%,#16041d_38%,#21082c_68%,#140316_100%)] text-white">
      <section className="relative px-6 pb-28 pt-28 text-center md:px-10 md:pb-32 md:pt-36 lg:px-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_22%,rgba(247,79,131,0.2),transparent_32%),radial-gradient(circle_at_16%_20%,rgba(255,182,43,0.1),transparent_28%)]" />

        <div className="mx-auto max-w-[980px]" data-stagger>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
            Club Calendar
          </p>
          <h1
            className="mt-5 text-5xl font-black uppercase leading-none text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.48)] md:text-7xl lg:text-8xl"
            data-reveal="headline-wipe"
          >
            <span className="club-line">
              <span>Events</span>
            </span>
          </h1>
          <p className="text-white/78 mx-auto mt-6 max-w-[44rem] text-base font-semibold leading-8 md:text-lg">
            Workshops, GBMs, socials, and build nights pulled from the Blade
            calendar.
          </p>
        </div>
      </section>

      <div className="club-paper-tear" aria-hidden="true" />

      <EventsClient
        bladeUrl={env.BLADE_URL}
        eventsEndpoint={eventsEndpoint.toString()}
      />
      <JsonLd data={eventsPageJsonLd} />

      <section className="relative overflow-hidden px-6 py-28 text-center md:px-10 lg:px-24">
        <div className="absolute -top-40 bottom-0 left-0 right-0 -z-10 bg-[radial-gradient(ellipse_at_50%_32%,rgba(247,79,131,0.16),transparent_46%),linear-gradient(180deg,rgba(20,3,22,0)_0%,rgba(46,8,54,0.14)_28%,rgba(89,22,139,0.28)_64%,rgba(20,3,22,0.42)_100%)]" />
        <div className="mx-auto max-w-[720px]" data-stagger>
          <h2
            className="text-5xl font-black uppercase leading-none text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.48)] md:text-6xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Get Notified</span>
            </span>
          </h2>
          <p className="mt-5 text-lg font-black text-[var(--club-gold)] md:text-xl">
            Email and text notifications
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="club-button bg-white text-black shadow-[5px_5px_0_var(--club-gold)]"
            >
              <a href={env.BLADE_URL} target="_blank" rel="noopener noreferrer">
                Sign Up With Blade
                <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="club-button bg-[#170d1c] text-white shadow-[5px_5px_0_rgba(255,255,255,0.35)]"
            >
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Follow On Instagram
                <Instagram aria-hidden="true" className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
