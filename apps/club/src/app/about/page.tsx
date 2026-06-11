import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
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
    image: "/workshop.jpg",
    alt: "Knight Hacks members working through a mentorship workshop together",
  },
  {
    label: "Spring Program",
    title: "Project Launch",
    body: "Project Launch is a spring build program where teams scope, build, and demo a project with lab hours, checkpoints, mentorship, and an end-of-semester expo.",
    image: "/projects1.JPG",
    alt: "Knight Hacks members presenting project work",
  },
  {
    label: "Events",
    title: "Build all year",
    body: "Around those programs, Knight Hacks runs GBMs, weekly workshops, socials, Operations Meetings, sponsor events, Hack Day in the spring or summer, and an annual 36-hour hackathon every fall.",
    image: "/hackathon.JPG",
    alt: "Knight Hacks hackathon attendees gathered in a large room",
  },
] as const;

const HIGHLIGHTS = [
  {
    value: "2015",
    label: "Founded as a UCF student organization",
  },
  {
    value: "700+",
    label: "Annual club members",
  },
  {
    value: "1,000+",
    label: "Technologists served at the annual hackathon",
  },
] as const;

const CULTURE_POINTS = [
  "Meet students who are learning the same tools, chasing the same ideas, and looking for people to build with.",
  "Find teammates, mentors, workshop friends, and familiar faces at GBMs, socials, project nights, and hackathon prep.",
  "Show up as a first-time coder, designer, organizer, or experienced builder. There is room to ask questions and grow.",
] as const;

function AboutButton({
  href,
  children,
  variant = "gold",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "gold" | "dark";
}) {
  const isExternal = href.startsWith("http");
  const className =
    variant === "gold"
      ? "club-button bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
      : "club-button bg-[#170d1c] text-white shadow-[4px_4px_0_rgba(255,255,255,0.35)]";

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
      <section className="relative isolate overflow-visible border-b border-white/10 bg-[#120313] px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-36 lg:px-24">
        <Image
          src="/members.JPG"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-[center_42%] brightness-[0.86] saturate-[1.02]"
        />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(18,3,19,0.72)_0%,rgba(18,3,19,0.62)_38%,rgba(18,3,19,0.9)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-[var(--club-plum)] to-transparent" />

        <div
          className="relative z-10 mx-auto w-full max-w-[1120px] text-center"
          data-stagger
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
            About Knight Hacks
          </p>
          <h1
            className="mx-auto mt-5 text-5xl font-black uppercase leading-none tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.48)] md:text-7xl lg:text-8xl"
            data-reveal="headline-flicker"
          >
            <span className="club-line">
              <span>UCF&apos;s home</span>
            </span>
            <span className="club-line">
              <span>to builders</span>
            </span>
          </h1>
          <p className="text-white/78 mx-auto mt-6 max-w-[39rem] text-base font-semibold leading-8 md:text-lg">
            Knight Hacks is UCF&apos;s student-run software engineering RSO and
            nonprofit, serving hundreds of annual members through programs,
            community events, and hackathons.
          </p>
          <div className="-mx-1 mt-8 flex flex-wrap justify-center gap-4 px-1 pb-2 pt-1">
            <AboutButton href="/events">View Events</AboutButton>
            <AboutButton href="https://discord.gg/knighthacks" variant="dark">
              Join Discord
            </AboutButton>
          </div>

          <div
            className="border-white/12 mt-9 grid gap-4 border-t pt-5 sm:grid-cols-3 sm:gap-6 md:mt-16 md:pt-7"
            data-stagger
          >
            {HIGHLIGHTS.map((highlight) => (
              <div key={highlight.label}>
                <p className="text-2xl font-black leading-none text-[var(--club-gold)] md:text-3xl">
                  {highlight.value}
                </p>
                <p className="text-white/68 mx-auto mt-2 max-w-[15rem] text-[11px] font-black uppercase leading-4 md:leading-5">
                  {highlight.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-10 md:py-28 lg:px-24">
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
              src="/projects2.jpg"
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

      <section className="px-6 pb-28 text-center md:px-10 md:pb-36 lg:px-24">
        <div
          className="mx-auto max-w-[760px] border-y border-white/10 py-16"
          data-stagger
        >
          <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
            Start Here
          </p>
          <h2
            className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.42)] md:text-6xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Start with</span>
            </span>
            <span className="club-line">
              <span>the next program.</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-[36rem] text-base font-semibold leading-8 text-[var(--club-muted)]">
            Sign into Blade to create your member profile, join the Discord
            community, follow Kickstart and Project Launch updates, and keep up
            with every Knight Hacks event.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <AboutButton href={env.BLADE_URL}>Sign Up With Blade</AboutButton>
            <AboutButton href="/teams" variant="dark">
              Meet The Team
            </AboutButton>
          </div>
        </div>
      </section>
    </main>
  );
}
