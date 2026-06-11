"use client";

import type { ImageLoaderProps } from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import type { TeamMember, TeamRoster, TeamSlug } from "./teams-config";
import { createEmptyRoster, TEAM_DEFINITIONS } from "./teams-config";

const CARD_ROTATIONS = ["-1.8deg", "1.7deg", "-1.4deg", "1.2deg", "-1deg"];
const STATIC_BACKGROUND_STYLE_ID = "club-teams-static-background";

type RosterStatus = "loading" | "ready" | "error";

const guildProfileImageLoader = ({ src }: ImageLoaderProps) => src;

const TEAM_APPLICATIONS = [
  {
    label: "Sponsorship",
    title: "Sponsorship Team Application",
    slug: "sponsorship-team-application-2026-2027",
    body: "Help build partner relationships, sponsor outreach, and company experiences.",
  },
  {
    label: "Workshop",
    title: "Workshop Team Application",
    slug: "workshop-team-application-2026-2027",
    body: "Plan technical workshops, teach practical skills, and support weekly learning.",
  },
  {
    label: "Design",
    title: "Design Team Application",
    slug: "design-team-application-2026-2027",
    body: "Shape the visuals, brand moments, graphics, and interfaces behind Knight Hacks.",
  },
  {
    label: "Outreach",
    title: "Outreach Team Application",
    slug: "outreach-team-application-2026-2027",
    body: "Grow the community through campus partnerships, member engagement, and events.",
  },
  {
    label: "Development",
    title: "Dev Team Application",
    slug: "dev-team-application-2026-2027",
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

  return (
    <article
      className="club-team-card group relative min-h-[19.25rem] border-[3px] border-black bg-[#301743] p-3.5 shadow-[8px_10px_0_rgba(0,0,0,0.48)] transition duration-200 hover:shadow-[11px_13px_0_rgba(0,0,0,0.55)]"
      style={{ "--team-rotate": rotation } as CSSProperties}
    >
      <div className="relative aspect-[1.45/1] overflow-hidden border-[2px] border-black bg-[#c5b8d2]">
        <MemberPortrait member={member} />
      </div>

      <div className="px-1 pb-1 pt-5">
        <h3 className="text-base font-black leading-5 text-white">
          {member.name}
        </h3>
        <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#ffd0de]">
          {member.teamRole}
        </p>
        {member.quote ? (
          <p className="mt-3 line-clamp-2 text-xs italic leading-4 text-[#f1e7f6]">
            {member.quote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EmptyTeam({ label, status }: { label: string; status: RosterStatus }) {
  const message =
    status === "loading"
      ? "Loading this team from Blade."
      : status === "error"
        ? "Blade did not return the roster. Check the configured Blade URL or local Blade server."
        : "No public Blade profiles matched this role yet.";

  return (
    <div className="bg-[#321445]/78 mx-auto max-w-xl border-[3px] border-black p-8 text-center shadow-[8px_10px_0_rgba(0,0,0,0.42)]">
      <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--club-gold)]">
        {label}
      </p>
      <p className="mt-4 text-base font-semibold leading-7 text-[#e7dced]">
        {message}
      </p>
    </div>
  );
}

function normalizeRoster(value: unknown): TeamRoster {
  const emptyRoster = createEmptyRoster();

  if (!value || typeof value !== "object") {
    return emptyRoster;
  }

  const incomingRoster = value as Partial<Record<TeamSlug, unknown>>;

  for (const team of TEAM_DEFINITIONS) {
    const members = incomingRoster[team.slug];

    if (!Array.isArray(members)) continue;

    emptyRoster[team.slug] = members.filter(
      (member): member is TeamMember =>
        !!member &&
        typeof member === "object" &&
        typeof (member as TeamMember).id === "string" &&
        typeof (member as TeamMember).name === "string" &&
        typeof (member as TeamMember).teamRole === "string",
    );
  }

  return emptyRoster;
}

export default function TeamsClient({
  bladeUrl,
  teamsEndpoint,
}: {
  bladeUrl: string;
  teamsEndpoint: string;
}) {
  const pendingScrollPosition = useRef<{ x: number; y: number } | null>(null);
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
  const totalMembers = TEAM_DEFINITIONS.reduce(
    (total, team) => total + roster[team.slug].length,
    0,
  );
  const rosterLabel =
    status === "loading"
      ? "Loading Blade profiles"
      : status === "error"
        ? "Blade roster unavailable"
        : `${totalMembers} Blade-linked profiles`;

  useEffect(() => {
    const root = document.documentElement;
    const styleElement = document.createElement("style");

    root.dataset.clubStaticBackground = "true";
    styleElement.id = STATIC_BACKGROUND_STYLE_ID;
    styleElement.textContent = `
      html[data-club-static-background="true"] .club-home-bg::before {
        animation: none !important;
      }
    `;
    document.head.append(styleElement);

    return () => {
      if (root.dataset.clubStaticBackground === "true") {
        delete root.dataset.clubStaticBackground;
      }

      styleElement.remove();
    };
  }, []);

  useLayoutEffect(() => {
    const scrollPosition = pendingScrollPosition.current;

    if (!scrollPosition) return;

    pendingScrollPosition.current = null;
    window.scrollTo(scrollPosition.x, scrollPosition.y);
    window.requestAnimationFrame(() => {
      window.scrollTo(scrollPosition.x, scrollPosition.y);
    });
  }, [activeTeam]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadRoster() {
      setStatus("loading");

      try {
        const response = await fetch(teamsEndpoint, {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Blade returned ${response.status}`);
        }

        const payload = (await response.json()) as { roster?: unknown };

        setRoster(normalizeRoster(payload.roster));
        setStatus("ready");
      } catch {
        if (abortController.signal.aborted) return;

        setRoster(createEmptyRoster());
        setStatus("error");
      }
    }

    void loadRoster();

    return () => abortController.abort();
  }, [teamsEndpoint]);

  function selectTeam(team: TeamSlug) {
    if (team === activeTeam) return;

    pendingScrollPosition.current = {
      x: window.scrollX,
      y: window.scrollY,
    };
    setActiveTeam(team);
  }

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-6 pb-28 pt-28 text-center md:px-10 md:pb-32 md:pt-36 lg:px-24">
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[#f7f1e9] shadow-[0_-5px_0_rgba(0,0,0,0.18)] [clip-path:polygon(0_34%,5%_18%,12%_28%,18%_10%,24%_28%,31%_18%,39%_34%,48%_14%,57%_30%,66%_16%,75%_32%,83%_15%,91%_30%,100%_18%,100%_100%,0_100%)]" />
        <div className="relative z-10 mx-auto max-w-5xl" data-stagger>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
            Club Leadership
          </p>
          <h1
            className="mt-5 text-5xl font-black uppercase leading-none text-white md:text-7xl lg:text-8xl"
            data-reveal="headline-punch"
          >
            <span className="club-line">
              <span>Our Team</span>
            </span>
          </h1>
          <p className="text-white/78 mx-auto mt-7 max-w-3xl text-base font-semibold leading-8 md:text-lg">
            The builders, organizers, and mentors behind every Knight Hacks
            event.
          </p>
        </div>
      </section>

      <section className="container py-24 md:py-28" aria-labelledby="teams-nav">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#f7b5cc]">
            {rosterLabel}
          </p>
          <h2
            id="teams-nav"
            className="mt-4 text-4xl font-black leading-tight text-[#ffef9b] md:text-5xl"
          >
            The Teams
          </h2>
          <div
            className="is-visible mx-auto mt-9 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-stagger
          >
            {TEAM_DEFINITIONS.map((team) => {
              const isActive = activeTeam === team.slug;

              return (
                <button
                  key={team.slug}
                  type="button"
                  className={cn(
                    "club-team-filter border-[3px] border-black px-6 py-4 text-sm font-black uppercase tracking-[0.08em] shadow-[5px_6px_0_rgba(0,0,0,0.42)] transition hover:-translate-y-1",
                    isActive
                      ? "bg-[#ffd0de] text-black shadow-[5px_6px_0_var(--club-gold-soft)]"
                      : "bg-[#3b1955] text-white hover:bg-[#522070]",
                  )}
                  aria-pressed={isActive}
                  onClick={() => selectTeam(team.slug)}
                >
                  {team.label}
                  <span className="ml-2 text-[var(--club-gold)]">
                    {roster[team.slug].length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="container pb-28 md:pb-36"
        aria-labelledby="team-members"
      >
        <div className="mx-auto max-w-6xl text-center">
          <h2
            id="team-members"
            className="text-4xl font-black leading-tight text-[#ffef9b] md:text-5xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Meet Our Team</span>
            </span>
          </h2>
          <p className="mt-5 text-lg font-black text-white">
            {activeDefinition.heading}
          </p>
        </div>

        {activeMembers.length > 0 ? (
          <div
            className="is-visible mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-x-9 gap-y-28 sm:grid-cols-2 lg:grid-cols-3"
            data-stagger
          >
            {activeMembers.map((member, index) => (
              <TeamCard key={member.id} member={member} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <EmptyTeam label={activeDefinition.label} status={status} />
          </div>
        )}
      </section>

      <section className="relative overflow-hidden px-6 py-28 md:py-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,3,22,0.02)_0%,rgba(42,7,48,0.18)_38%,rgba(91,13,73,0.34)_100%)]"
        />
        <div className="relative z-10 mx-auto max-w-[88rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="text-5xl font-black uppercase leading-none text-white md:text-7xl"
              data-reveal="headline"
            >
              <span className="club-line">
                <span>Want to Join?</span>
              </span>
            </h2>
            <p className="mt-6 text-xl font-black text-[var(--club-gold)]">
              Applications open year round
            </p>
          </div>

          <div
            className="is-visible mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-5"
            data-stagger
          >
            {TEAM_APPLICATIONS.map((application) => (
              <a
                key={application.slug}
                href={getFormHref(bladeUrl, application.slug)}
                className="club-application-card bg-[#2a0c31]/86 group flex min-h-[16rem] flex-col border-[3px] border-black p-6 text-left shadow-[8px_10px_0_rgba(0,0,0,0.42)] transition duration-200 hover:-translate-y-1.5 hover:bg-[#35113f] hover:shadow-[11px_13px_0_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--club-gold)]"
              >
                <span className="w-fit bg-[var(--club-gold)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                  {application.label}
                </span>
                <h3 className="mt-5 text-2xl font-black uppercase leading-[1.02] text-white">
                  {application.title}
                </h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#eaddec]">
                  {application.body}
                </p>
                <span className="mt-auto inline-flex items-center pt-8 text-sm font-black uppercase text-[var(--club-gold)]">
                  Apply
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-2 size-4 transition group-hover:translate-x-1"
                  />
                </span>
              </a>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button asChild className="club-button club-button-pink px-9">
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
