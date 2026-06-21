import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
import { CLUB_ASSETS } from "../_lib/assets";
import { PUBLIC_LINKS } from "../_lib/site-config";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Learn about Knight Hacks, UCF's student-run software engineering RSO and nonprofit founded in 2015.",
  path: "/about",
});

const PROGRAMS = [
  {
    label: "Fall Program",
    title: "Kickstart Mentorship",
    body: "Kickstart runs every fall during recruiting season, pairing newer technologists with mentors by interests, goals, and experience so students can learn with a small group instead of starting alone.",
    image: CLUB_ASSETS.kickstartWorkshopSession,
    alt: "Knight Hacks member presenting a workshop session",
  },
  {
    label: "Spring Program",
    title: "Project Launch",
    body: "Project Launch is a spring build program where teams scope, build, and demo a project with lab hours, checkpoints, mentorship, and an end-of-semester expo.",
    image: CLUB_ASSETS.clubGbmAudience,
    alt: "Knight Hacks members gathered for a club event",
  },
  {
    label: "Events",
    title: "Build all year",
    body: "Around those programs, Knight Hacks runs GBMs, weekly workshops, socials, Operations Meetings, sponsor events, Hack Day in the spring or summer, and an annual 36-hour hackathon every fall.",
    image: CLUB_ASSETS.hackathonMainRoom,
    alt: "Knight Hacks hackathon attendees gathered in a large room",
  },
] as const;

const START_HERE = {
  label: "Start Here",
  title: "Blade",
  image: CLUB_ASSETS.devTeamPic,
  alt: "Knight Hacks development team standing together by Lake Eola",
} as const;

const CULTURE_POINTS = [
  "Meet students who are learning the same tools, chasing the same ideas, and looking for people to build with.",
  "Find teammates, mentors, workshop friends, and familiar faces at GBMs, socials, project nights, and hackathon prep.",
  "Show up as a first-time coder, designer, organizer, or experienced builder. There is room to ask questions and grow.",
] as const;

function AboutButton({
  href,
  children,
  variant = "gold",
  fullWidth = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "gold" | "dark";
  fullWidth?: boolean;
}) {
  const isExternal = href.startsWith("http");
  const className = [
    variant === "gold"
      ? "club-button bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
      : "club-button bg-[#170d1c] text-white shadow-[4px_4px_0_rgba(255,255,255,0.35)]",
    fullWidth ? "w-full justify-center" : "",
  ].join(" ");

  const content = (
    <>
      {children}
      <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
    </>
  );

  return (
    <Button asChild size="lg" className={className}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        <Link href={href}>{content}</Link>
      )}
    </Button>
  );
}

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden text-white">
      <section
        className="club-page-hero relative isolate min-h-[100svh] overflow-hidden bg-[#110214] px-5 pt-20 text-center sm:px-6 md:px-10 lg:px-24"
        data-hero
      >
        <Image
          src={CLUB_ASSETS.clubMembersGathering}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-[center_42%] brightness-[0.92] contrast-[1.03] saturate-[1.02]"
          data-hero-media
        />
        <div
          className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(11,0,14,0.72)_0%,rgba(11,0,14,0.18)_34%,rgba(17,2,20,0.12)_58%,#140422_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_32%,rgba(255,182,43,0.16)_0%,rgba(247,79,131,0.08)_30%,transparent_58%)]"
          data-hero-overlay
        />
        <div
          className="club-page-hero-fade absolute inset-x-0 bottom-0 z-[1]"
          data-hero-overlay
        />

        <div
          className="club-hero-logo-aligned-content club-about-hero-content relative z-10 mx-auto flex min-h-[calc(100svh-var(--club-nav-height))] w-full max-w-[1060px] flex-col items-center justify-start pb-10 text-center sm:pb-14 md:pb-16"
          data-hero-content
          data-stagger
        >
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--club-gold)] [text-shadow:3px_3px_0_rgba(0,0,0,0.52)] sm:text-xs sm:tracking-[0.18em] md:text-sm">
            About Knight Hacks
          </p>
          <h1
            className="mx-auto mt-4 text-[44px] font-black uppercase leading-[0.94] tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.48)] max-[374px]:text-[38px] sm:text-[54px] md:mt-5 md:text-[88px] md:leading-none md:[text-shadow:7px_7px_0_rgba(0,0,0,0.48)] lg:text-[96px]"
            data-reveal="headline"
          >
            <span className="club-line">
              <span className="whitespace-nowrap">UCF&apos;s home</span>
            </span>
            <span className="club-line">
              <span className="whitespace-nowrap">to builders</span>
            </span>
          </h1>
          <p className="text-white/86 mx-auto mt-5 max-w-[22rem] text-[15px] font-medium leading-7 sm:mt-6 sm:max-w-[28rem] sm:text-base sm:leading-8 md:mt-7 md:max-w-[650px] md:text-[21px] md:leading-[34px]">
            Knight Hacks is UCF&apos;s student run software engineering RSO and
            nonprofit.
          </p>
          <div className="club-about-hero-actions -mx-1 mt-7 flex flex-wrap justify-center gap-3 px-1 pb-2 pt-1 sm:mt-8 sm:gap-4">
            <AboutButton href="/events">View Events</AboutButton>
            <AboutButton href={PUBLIC_LINKS.discord} variant="dark">
              Join Discord
            </AboutButton>
          </div>
        </div>
      </section>

      <div className="club-hero-transition-layer" aria-hidden="true" />

      <section className="club-post-hero-section px-6 pb-24 md:px-10 md:pb-28 lg:px-24">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1fr] lg:items-start">
            <div data-stagger>
              <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
                Our Programs
              </p>
              <h2
                className="mt-4 max-w-[42rem] text-4xl font-black uppercase leading-[0.95] tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.42)] md:text-5xl lg:text-6xl"
                data-reveal="headline"
              >
                <span className="club-line">
                  <span>Build all year.</span>
                </span>
                <span className="club-line">
                  <span>Find your people.</span>
                </span>
              </h2>
            </div>
            <div
              className="max-w-[37rem] border-l-2 border-[var(--club-gold)] pl-6 lg:mt-11"
              data-stagger
            >
              <p className="text-base font-semibold leading-8 text-[var(--club-muted)] md:text-lg">
                Knight Hacks gives UCF students a place to learn, meet
                teammates, and keep building after the first workshop ends.
              </p>
              <p className="text-white/66 mt-5 text-sm font-black uppercase leading-6 tracking-[0.16em]">
                Kickstart mentorship, Project Launch teams, weekly workshops,
                socials, sponsor events, and hackathon prep.
              </p>
            </div>
          </div>

          <div className="mt-16 divide-y divide-white/10 border-y border-white/10">
            <article
              data-stagger
              className="grid gap-8 py-10 md:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14"
            >
              <div
                className="relative aspect-[1.45] overflow-hidden border-[3px] border-black bg-[#1d1325] shadow-[8px_9px_0_rgba(0,0,0,0.36)]"
                data-reveal="photo"
              >
                <Image
                  src={START_HERE.image}
                  alt={START_HERE.alt}
                  fill
                  sizes="(min-width: 1024px) 30rem, 92vw"
                  className="object-cover"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-normal text-[var(--club-gold)]">
                  00 / {START_HERE.label}
                </p>
                <h3 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.36)] md:text-6xl">
                  {START_HERE.title}
                </h3>
                <p className="mt-5 max-w-[36rem] text-base font-semibold leading-8 text-[var(--club-muted)]">
                  Blade is the Knight Hacks member portal for{" "}
                  <strong className="font-black text-white">paying dues</strong>
                  ,{" "}
                  <strong className="font-black text-white">
                    signing in at events
                  </strong>
                  ,{" "}
                  <strong className="font-black text-white">
                    managing your KH profile
                  </strong>
                  ,{" "}
                  <strong className="font-black text-white">
                    joining the Discord community
                  </strong>
                  , and keeping up with Kickstart, Project Launch, and club
                  updates.
                </p>
                <div className="mt-7 max-w-[36rem]">
                  <AboutButton href={env.BLADE_URL} fullWidth>
                    Sign Up With Blade
                  </AboutButton>
                </div>
              </div>
            </article>

            {PROGRAMS.map((program, index) => (
              <article
                key={program.label}
                data-stagger
                className="grid gap-8 py-10 md:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14"
              >
                <div
                  className={
                    index % 2 === 1
                      ? "relative aspect-[1.45] overflow-hidden border-[3px] border-black bg-[#1d1325] shadow-[8px_9px_0_rgba(0,0,0,0.36)] lg:order-2"
                      : "relative aspect-[1.45] overflow-hidden border-[3px] border-black bg-[#1d1325] shadow-[8px_9px_0_rgba(0,0,0,0.36)]"
                  }
                  data-reveal="photo"
                >
                  <Image
                    src={program.image}
                    alt={program.alt}
                    fill
                    sizes="(min-width: 1024px) 30rem, 92vw"
                    className="object-cover"
                  />
                </div>

                <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                  <p className="text-xs font-black uppercase tracking-normal text-[var(--club-gold)]">
                    {String(index + 1).padStart(2, "0")} / {program.label}
                  </p>
                  <h3 className="mt-4 text-3xl font-black uppercase leading-none tracking-normal text-white md:text-5xl">
                    {program.title}
                  </h3>
                  <p className="mt-5 max-w-[36rem] text-base font-semibold leading-8 text-[var(--club-muted)]">
                    {program.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-10 md:pb-32 lg:px-24">
        <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div
            className="relative aspect-[1.28] overflow-hidden border-[3px] border-black bg-[#1d1325] shadow-[10px_12px_0_rgba(0,0,0,0.38)]"
            data-reveal="photo"
            data-scroll-drift="16"
          >
            <Image
              src={CLUB_ASSETS.projectCollaboration}
              alt="Knight Hacks members collaborating on project work"
              fill
              sizes="(min-width: 1024px) 44rem, 92vw"
              className="object-cover"
            />
          </div>

          <div data-stagger>
            <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
              Community
            </p>
            <h2
              className="mt-4 max-w-[34rem] text-4xl font-black uppercase leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.42)] md:text-5xl"
              data-reveal="headline"
            >
              <span className="club-line">
                <span>A community</span>
              </span>
              <span className="club-line">
                <span>that builds together.</span>
              </span>
            </h2>
            <p className="text-white/72 mt-6 max-w-[34rem] text-base font-semibold leading-8 md:text-lg">
              Knight Hacks is where UCF students find teammates, mentors, and
              friends while learning how to ship real projects.
            </p>
            <div
              className="mt-8 border-l-2 border-[var(--club-gold)] pl-6"
              data-stagger
            >
              {CULTURE_POINTS.map((point) => (
                <p
                  key={point}
                  className="border-b border-white/10 py-4 text-base font-semibold leading-7 text-[var(--club-muted)] last:border-b-0"
                >
                  {point}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
