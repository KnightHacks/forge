"use client";

import type { Transition } from "framer-motion";
import type { ImageLoaderProps } from "next/image";
import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import type { TeamMember, TeamRoster, TeamSlug } from "./teams-config";
import { useDeferredSectionLoad } from "../_components/use-deferred-section-load";
import { CLUB_ASSETS } from "../_lib/assets";
import { loadClubTeamRoster } from "./team-roster";
import {
  countUniqueTeamMembers,
  createEmptyRoster,
  TEAM_DEFINITIONS,
} from "./teams-config";

const CARD_ROTATIONS = ["-1.8deg", "1.7deg", "-1.4deg", "1.2deg", "-1deg"];
const TEAM_APPLICATIONS_ID = "team-applications";

type RosterStatus = "loading" | "ready" | "error";

const guildProfileImageLoader = ({ src }: ImageLoaderProps) => src;

const TEAM_APPLICATIONS = [
  {
    label: "Sponsorship",
    title: "Sponsorship Team Application",
    slug: "sponsorship-team-application",
    body: "Help build partner relationships, sponsor outreach, and company experiences.",
  },
  {
    label: "Workshop",
    title: "Workshop Team Application",
    slug: "workshop-team-application",
    body: "Plan technical workshops, teach practical skills, and support weekly learning.",
  },
  {
    label: "Design",
    title: "Design Team Applications",
    slug: "design-team-applications",
    body: "Shape the visuals, brand moments, graphics, and interfaces behind Knight Hacks.",
  },
  {
    label: "Outreach",
    title: "Outreach Team Applications",
    slug: "outreach-team-applications",
    body: "Grow the community through campus partnerships, member engagement, and events.",
  },
  {
    label: "Development",
    title: "Dev Team Applications",
    slug: "dev-team-applications",
    body: "Build and maintain the software that powers Knight Hacks, Blade, and club tools.",
  },
] as const;

function getFormHref(bladeUrl: string, slug: string) {
  return new URL(`/forms/${encodeURIComponent(slug)}`, bladeUrl).toString();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberPortrait({ member }: { member: TeamMember }) {
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt={member.name}
        width={420}
        height={420}
        loader={guildProfileImageLoader}
        unoptimized
        className="h-full w-full object-cover"
        sizes="(min-width: 1024px) 260px, (min-width: 640px) 40vw, 82vw"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#c5b8d2] text-5xl font-black text-[#4c4058]">
      {getInitials(member.name)}
    </div>
  );
}

function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length] ?? "0deg";
  const cardContent = (
    <article
      className={cn(
        "club-team-card group relative min-h-[17.25rem] border-2 border-black bg-[#301743] p-2.5 shadow-[5px_6px_0_rgba(0,0,0,0.48)] transition duration-200 sm:min-h-[19.25rem] sm:border-[3px] sm:p-3.5 sm:shadow-[8px_10px_0_rgba(0,0,0,0.48)]",
        member.linkedinUrl
          ? "sm:hover:-translate-y-1 sm:hover:shadow-[11px_13px_0_rgba(0,0,0,0.55)]"
          : "sm:hover:shadow-[11px_13px_0_rgba(0,0,0,0.55)]",
      )}
      style={{ "--team-rotate": rotation } as CSSProperties}
    >
      <div className="relative aspect-[1.45/1] overflow-hidden border-[2px] border-black bg-[#c5b8d2]">
        <MemberPortrait member={member} />
      </div>

      <div className="flex items-start justify-between gap-3 px-0.5 pb-1 pt-4 sm:gap-4 sm:px-1 sm:pt-5">
        <div className="min-w-0">
          <h3 className="text-base font-black leading-5 text-white">
            {member.name}
          </h3>
          <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#ffd0de]">
            {member.teamRole}
          </p>
        </div>

        {member.linkedinUrl ? (
          <span className="flex size-8 shrink-0 items-center justify-center border-[2px] border-black bg-[#ffd0de] text-black shadow-[3px_4px_0_var(--club-gold-soft)] transition group-hover:-translate-y-0.5 group-hover:bg-[var(--club-gold)] sm:size-9">
            <FaLinkedin aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
    </article>
  );

  if (member.linkedinUrl) {
    return (
      <a
        href={member.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${member.name}'s LinkedIn profile`}
        className="block focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-[var(--club-gold)]"
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

function EmptyTeam({ label, status }: { label: string; status: RosterStatus }) {
  const message =
    status === "loading"
      ? "Loading this team from Blade."
      : status === "error"
        ? "Blade did not return the roster. Check the configured Blade URL or local Blade server."
        : "No public Blade profiles matched this role yet.";

  return (
    <div className="bg-[#321445]/78 mx-auto max-w-xl border-[3px] border-black p-5 text-center shadow-[6px_8px_0_rgba(0,0,0,0.42)] sm:p-8 sm:shadow-[8px_10px_0_rgba(0,0,0,0.42)]">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--club-gold)] sm:text-sm sm:tracking-[0.28em]">
        {label}
      </p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#e7dced] sm:mt-4 sm:text-base sm:leading-7">
        {message}
      </p>
    </div>
  );
}

export default function TeamsClient({ bladeUrl }: { bladeUrl: string }) {
  const { ref: rosterSectionRef, shouldLoad: shouldLoadRoster } =
    useDeferredSectionLoad<HTMLElement>();
  const pendingScrollPosition = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [roster, setRoster] = useState<TeamRoster>(() => createEmptyRoster());
  const [status, setStatus] = useState<RosterStatus>("loading");
  const [activeTeam, setActiveTeam] = useState<TeamSlug>(
    TEAM_DEFINITIONS[0].slug,
  );
  const activeDefinition = useMemo(
    () =>
      TEAM_DEFINITIONS.find((team) => team.slug === activeTeam) ??
      TEAM_DEFINITIONS[0],
    [activeTeam],
  );
  const activeMembers = roster[activeTeam];
  const totalMembers = useMemo(() => countUniqueTeamMembers(roster), [roster]);
  const teamCountLabel =
    status === "loading"
      ? "Loading team members"
      : status === "error"
        ? "Blade roster unavailable"
        : `${totalMembers} team ${totalMembers === 1 ? "member" : "members"}`;
  const teamTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: "easeOut" };

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.clubStaticBackground = "true";

    return () => {
      if (root.dataset.clubStaticBackground === "true") {
        delete root.dataset.clubStaticBackground;
      }
    };
  }, []);

  useLayoutEffect(() => {
    const scrollPosition = pendingScrollPosition.current;

    if (!scrollPosition) return;

    pendingScrollPosition.current = null;
    window.scrollTo(scrollPosition.x, scrollPosition.y);
    const animationFrameId = window.requestAnimationFrame(() => {
      window.scrollTo(scrollPosition.x, scrollPosition.y);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activeTeam]);

  useEffect(() => {
    if (!shouldLoadRoster) return;

    const abortController = new AbortController();

    async function loadRoster() {
      setStatus("loading");

      try {
        setRoster(await loadClubTeamRoster(bladeUrl, abortController.signal));
        setStatus("ready");
      } catch {
        if (abortController.signal.aborted) return;

        setRoster(createEmptyRoster());
        setStatus("error");
      }
    }

    void loadRoster();

    return () => abortController.abort();
  }, [bladeUrl, shouldLoadRoster]);

  function selectTeam(team: TeamSlug) {
    if (team === activeTeam) return;

    pendingScrollPosition.current = {
      x: window.scrollX,
      y: window.scrollY,
    };
    setActiveTeam(team);
  }

  function scrollToApplications(event: MouseEvent<HTMLAnchorElement>) {
    const applicationsSection = document.getElementById(TEAM_APPLICATIONS_ID);

    if (!applicationsSection) return;

    event.preventDefault();
    applicationsSection.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${TEAM_APPLICATIONS_ID}`);
  }

  return (
    <main className="min-h-screen">
      <section
        className="club-page-hero relative isolate min-h-[100svh] overflow-hidden bg-[#110214] px-5 pt-20 text-center md:px-10 lg:px-24"
        data-hero
      >
        <Image
          src={CLUB_ASSETS.clubTeamWaterfrontGroup}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-[center_38%] brightness-[0.94] contrast-[1.02] saturate-[1.04]"
          data-hero-media
        />
        <div
          className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(11,0,14,0.72)_0%,rgba(11,0,14,0.18)_34%,rgba(17,2,20,0.12)_58%,#140422_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_26%,rgba(255,182,43,0.16)_0%,rgba(247,79,131,0.08)_30%,transparent_58%)]"
          data-hero-overlay
        />
        <div
          className="club-page-hero-fade absolute inset-x-0 bottom-0 z-[1]"
          data-hero-overlay
        />

        <div
          className="club-hero-logo-aligned-content relative z-10 mx-auto flex min-h-[calc(100svh-var(--club-nav-height))] w-full max-w-[1060px] flex-col items-center justify-start pb-16 text-center"
          data-hero-content
          data-stagger
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] [text-shadow:3px_3px_0_rgba(0,0,0,0.5)] md:text-sm">
            Club Leadership
          </p>
          <h1
            className="mx-auto mt-5 text-[56px] font-black uppercase leading-none tracking-normal text-white [text-shadow:6px_6px_0_rgba(0,0,0,0.48)] md:text-[88px] md:[text-shadow:7px_7px_0_rgba(0,0,0,0.48)] lg:text-[96px]"
            data-reveal="headline-punch"
          >
            <span className="club-line">
              <span>Our Team</span>
            </span>
          </h1>
          <p className="text-white/86 mx-auto mt-5 max-w-[22rem] text-[15px] font-medium leading-7 md:mt-7 md:max-w-[650px] md:text-[21px] md:leading-[34px]">
            The builders, organizers, and mentors behind every Knight Hacks
            event.
          </p>
          <Button
            asChild
            size="lg"
            className="club-button mt-8 bg-[var(--club-gold)] px-8 text-black shadow-[5px_5px_0_rgba(255,255,255,0.85)] md:mt-10"
          >
            <a href={`#${TEAM_APPLICATIONS_ID}`} onClick={scrollToApplications}>
              View Applications
              <ChevronDown aria-hidden="true" className="ml-2 size-4" />
            </a>
          </Button>
          <p className="sr-only">Knight Hacks team members by the water.</p>
        </div>
      </section>

      <div className="club-teams-hero-transition" aria-hidden="true" />

      <section
        ref={rosterSectionRef}
        className="club-teams-post-section container pb-10 md:pb-12"
        aria-labelledby="team-members"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl text-left">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f7b5cc] md:text-xs">
                {teamCountLabel}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={activeTeam}
                  id="team-members"
                  className="mt-1.5 text-[1.75rem] font-black leading-[1.04] text-[#ffef9b] min-[420px]:text-[1.9rem] md:mt-2 md:text-4xl md:leading-tight"
                  initial={
                    prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -8 }
                  }
                  transition={teamTransition}
                >
                  {activeDefinition.heading}
                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="relative md:hidden">
              <select
                value={activeTeam}
                onChange={(event) => selectTeam(event.target.value as TeamSlug)}
                aria-label="Choose team"
                className="h-11 w-full appearance-none border-2 border-black bg-[#ffd0de] px-3 pr-10 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[3px_4px_0_rgba(0,0,0,0.34)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--club-gold)]"
              >
                {TEAM_DEFINITIONS.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.label} ({roster[team.slug].length})
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-black"
              />
            </div>

            <div
              className="hidden max-w-[44rem] flex-wrap items-center justify-end gap-x-4 gap-y-2 md:flex"
              aria-label="Team filters"
            >
              {TEAM_DEFINITIONS.map((team) => {
                const isActive = activeTeam === team.slug;

                return (
                  <button
                    key={team.slug}
                    type="button"
                    className={cn(
                      "club-team-filter border-b-2 pb-1 text-xs font-black uppercase leading-none tracking-[0.08em] transition-colors hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--club-gold)] lg:text-[13px]",
                      isActive
                        ? "border-[#ffef9b] text-[#ffef9b]"
                        : "text-white/58 border-transparent",
                    )}
                    aria-pressed={isActive}
                    onClick={() => selectTeam(team.slug)}
                  >
                    {team.label}
                    <span
                      className={cn(
                        "ml-1 text-[var(--club-gold)]",
                        isActive ? "opacity-100" : "opacity-85",
                      )}
                    >
                      {roster[team.slug].length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeTeam}-${status}`}
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 0.985, y: 14 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.99, y: -10 }
              }
              transition={teamTransition}
            >
              {activeMembers.length > 0 ? (
                <motion.div
                  className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-x-7 gap-y-10 sm:mt-10 sm:grid-cols-2 sm:gap-y-16 md:mt-12 lg:grid-cols-3 lg:gap-y-20"
                  variants={{
                    show: prefersReducedMotion
                      ? {}
                      : {
                          transition: {
                            delayChildren: 0.03,
                            staggerChildren: 0.045,
                          },
                        },
                  }}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                >
                  {activeMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      variants={{
                        hidden: prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 0, scale: 0.97, y: 16 },
                        show: { opacity: 1, scale: 1, y: 0 },
                      }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { duration: 0.26, ease: "easeOut" }
                      }
                    >
                      <TeamCard member={member} index={index} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="mt-10">
                  <EmptyTeam label={activeDefinition.label} status={status} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section
        id={TEAM_APPLICATIONS_ID}
        className="relative scroll-mt-24 overflow-hidden px-5 py-16 md:scroll-mt-28 md:px-6 md:py-36"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,3,22,0.02)_0%,rgba(42,7,48,0.18)_38%,rgba(91,13,73,0.34)_100%)]"
        />
        <div className="relative z-10 mx-auto max-w-[88rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="text-4xl font-black uppercase leading-none text-white md:text-7xl"
              data-reveal="headline"
            >
              <span className="club-line">
                <span>Want to Join?</span>
              </span>
            </h2>
            <p className="mt-4 text-base font-black text-[var(--club-gold)] md:mt-6 md:text-xl">
              Applications open year round
            </p>
          </div>

          <div
            className="is-visible mt-9 grid gap-3 md:mt-14 md:grid-cols-2 md:gap-5 xl:grid-cols-5"
            data-stagger
          >
            {TEAM_APPLICATIONS.map((application) => (
              <a
                key={application.slug}
                href={getFormHref(bladeUrl, application.slug)}
                className="club-application-card bg-[#2a0c31]/86 group flex min-h-0 flex-col border-2 border-black p-4 text-left shadow-[5px_6px_0_rgba(0,0,0,0.42)] transition duration-200 hover:-translate-y-1.5 hover:bg-[#35113f] hover:shadow-[8px_10px_0_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--club-gold)] md:min-h-[16rem] md:border-[3px] md:p-6 md:shadow-[8px_10px_0_rgba(0,0,0,0.42)] md:hover:shadow-[11px_13px_0_rgba(0,0,0,0.5)]"
              >
                <span className="w-fit bg-[var(--club-gold)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                  {application.label}
                </span>
                <h3 className="mt-4 text-xl font-black uppercase leading-[1.02] text-white md:mt-5 md:text-2xl">
                  {application.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#eaddec] md:mt-4">
                  {application.body}
                </p>
                <span className="mt-auto inline-flex items-center pt-4 text-sm font-black uppercase text-[var(--club-gold)] md:pt-8">
                  Apply
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-2 size-4 transition group-hover:translate-x-1"
                  />
                </span>
              </a>
            ))}
          </div>

          <div className="mt-9 flex justify-center md:mt-12">
            <Button
              asChild
              className="club-button club-button-pink w-full px-9 sm:w-auto"
            >
              <a href={bladeUrl}>
                Open Blade
                <ArrowRight aria-hidden="true" className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
