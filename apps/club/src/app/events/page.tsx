import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { FaInstagram } from "react-icons/fa";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
import JsonLd from "../_components/json-ld";
import { CLUB_ASSETS } from "../_lib/assets";
import {
  BLADE_URL,
  createPageMetadata,
  createWebPageJsonLd,
  DISCORD_URL,
  INSTAGRAM_URL,
  SITE_URL,
} from "../seo";
import { EventsClient } from "./events-client";

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
      <section
        className="club-page-hero relative isolate min-h-[100svh] overflow-hidden bg-[#110214] px-6 pt-20 text-center md:px-10 lg:px-24"
        data-hero
      >
        <Image
          src={CLUB_ASSETS.eventsExpoFloor}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-center brightness-[0.9] contrast-[1.04] saturate-[1.02]"
          data-hero-media
        />
        <div
          className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(11,0,14,0.72)_0%,rgba(11,0,14,0.18)_34%,rgba(17,2,20,0.12)_58%,#140422_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_34%,rgba(255,182,43,0.16)_0%,rgba(247,79,131,0.08)_30%,transparent_58%)]"
          data-hero-overlay
        />
        <div
          className="club-page-hero-fade absolute inset-x-0 bottom-0 z-[1]"
          data-hero-overlay
        />

        <div
          className="club-hero-logo-aligned-content relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[1060px] flex-col items-center justify-start pb-16 text-center"
          data-hero-content
          data-stagger
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] [text-shadow:3px_3px_0_rgba(0,0,0,0.52)] md:text-sm">
            Club Calendar
          </p>
          <h1
            className="mx-auto mt-5 text-[56px] font-black uppercase leading-none tracking-normal text-white [text-shadow:7px_7px_0_rgba(0,0,0,0.48)] md:text-[88px] lg:text-[96px]"
            data-reveal="headline-wipe"
          >
            <span className="club-line">
              <span>Events</span>
            </span>
          </h1>
          <p className="text-white/86 mx-auto mt-7 max-w-[650px] text-base font-medium leading-8 md:text-[21px] md:leading-[34px]">
            Workshops, GBMs, socials, and build nights pulled from the Blade
            calendar.
          </p>
          <Button
            asChild
            size="lg"
            className="club-button mt-10 bg-[var(--club-gold)] px-8 text-black shadow-[5px_5px_0_rgba(255,255,255,0.85)]"
          >
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Follow On Instagram
              <FaInstagram aria-hidden="true" className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </section>

      <div className="club-hero-transition-layer" aria-hidden="true" />

      <EventsClient
        bladeUrl={env.BLADE_URL}
        eventLimit={48}
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
                <FaInstagram aria-hidden="true" className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
