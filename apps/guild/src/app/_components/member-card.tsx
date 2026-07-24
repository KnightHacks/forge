"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Github,
  Globe2,
  GraduationCap,
  History,
  Linkedin,
} from "lucide-react";

import type { GuildProfile } from "@forge/validators";
import { GUILD } from "@forge/consts";

function initials(profile: GuildProfile) {
  return `${profile.firstName.at(0) ?? ""}${profile.lastName.at(0) ?? ""}`;
}

export function MemberCard({
  index = 0,
  profile,
  returnTo = "/",
}: {
  index?: number;
  profile: GuildProfile;
  returnTo?: string;
}) {
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const graduationYear = profile.gradDate.slice(0, 4);
  const memberSinceYear = profile.memberSinceDate.slice(0, 4);
  const isAlumni = profile.memberStatus === "alumni";
  const style = {
    "--role-accent": profile.roleCallout?.color ?? "hsl(var(--guild-blue))",
  } as CSSProperties;
  const entranceDelay = Math.min(index * 0.035, 0.42);
  const externalLinks = [
    {
      href: profile.linkedinProfileUrl,
      icon: Linkedin,
      label: "LinkedIn",
    },
    { href: profile.githubProfileUrl, icon: Github, label: "GitHub" },
    { href: profile.websiteUrl, icon: Globe2, label: "Portfolio" },
  ].filter((link): link is typeof link & { href: string } =>
    Boolean(link.href),
  );

  return (
    <motion.article
      className="guild-card group relative flex min-h-80 min-w-0 flex-col rounded-lg border border-white/10"
      data-has-role={profile.roleCallout ? "true" : "false"}
      data-has-tagline={profile.tagline ? "true" : "false"}
      data-member-status={profile.memberStatus}
      data-team-member={profile.roleCallout ? "true" : undefined}
      data-entrance-index={index}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: {
          delay: entranceDelay,
          duration: 0.32,
          ease: [0.2, 0.8, 0.2, 1],
        },
      }}
      viewport={{ amount: 0.12, once: true }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      whileTap={{ scale: 0.995, transition: { duration: 0.1 } }}
      style={style}
    >
      <Link
        href={{
          pathname: `/members/${profile.id}`,
          query: returnTo === "/" ? undefined : { from: returnTo },
        }}
        aria-label={`View ${name}'s Guild profile`}
        className="guild-profile-link absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="sr-only">View {name}&apos;s Guild profile</span>
      </Link>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col">
          <div className="guild-card-identity flex h-[5.25rem] items-start gap-3.5">
            {profile.profilePictureUrl ? (
              // Signed storage hosts are configured in next.config.js.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profilePictureUrl}
                alt=""
                className="guild-card-image h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
              />
            ) : (
              <div
                aria-hidden="true"
                className="guild-card-image flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--guild-blue)/0.13)] text-base font-semibold text-[hsl(var(--guild-blue))] ring-1 ring-[hsl(var(--guild-blue)/0.28)]"
              >
                {initials(profile)}
              </div>
            )}
            <div className="flex h-full min-w-0 flex-1 flex-col pt-0.5">
              <h2 className="truncate text-base font-semibold leading-5 tracking-tight transition-colors duration-200 group-hover:text-[hsl(var(--guild-blue))]">
                {name}
              </h2>
              <p className="guild-card-tagline mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                {profile.tagline ?? "Knight Hacks community member"}
              </p>
              <div className="guild-card-meta mt-auto flex min-w-0 items-center gap-3">
                <p
                  aria-label={
                    isAlumni
                      ? `Alumni, class of ${graduationYear}`
                      : `Class of ${graduationYear}`
                  }
                  title={
                    isAlumni
                      ? `Alumni · ${graduationYear}`
                      : `Class of ${graduationYear}`
                  }
                  className={
                    isAlumni
                      ? "guild-card-grad-meta guild-card-grad-meta-alumni flex shrink-0 items-center gap-1.5 text-xs font-semibold leading-4"
                      : "guild-card-grad-meta flex shrink-0 items-center gap-1.5 text-xs font-medium leading-4"
                  }
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{graduationYear}</span>
                </p>
                <p
                  aria-label={`Member since ${memberSinceYear}`}
                  title={`Member since ${memberSinceYear}`}
                  className="guild-card-tenure-meta flex min-w-0 items-center gap-1.5 text-xs font-medium leading-4"
                >
                  <History
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">Since {memberSinceYear}</span>
                </p>
              </div>
            </div>
          </div>

          {profile.roleCallout || isAlumni ? (
            <div className="guild-card-tags mt-3 flex h-9 min-w-0 items-center overflow-hidden">
              {profile.roleCallout ? (
                <div className="guild-team-callout flex h-9 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-md px-3">
                  <span
                    className="guild-role-marker h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--role-accent)]"
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 truncate text-sm font-semibold text-foreground"
                    title={profile.roleCallout.label}
                  >
                    {profile.roleCallout.label}
                  </span>
                </div>
              ) : null}
              {isAlumni ? (
                <span
                  className="guild-alumni-pill flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-3 text-sm font-semibold"
                  aria-label="Alumni member"
                >
                  <span
                    className="guild-alumni-marker h-2.5 w-2.5 shrink-0 rounded-sm"
                    aria-hidden="true"
                  />
                  Alumni
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="guild-card-context mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[2.5rem_1.25rem] gap-2.5 text-sm text-muted-foreground">
            <div className="flex min-w-0 items-start gap-2.5">
              <GraduationCap
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="line-clamp-2 min-w-0 flex-1">
                {profile.major} · {profile.school}
              </span>
            </div>
            <div className="min-h-5 min-w-0">
              {profile.company ? (
                <p className="flex min-w-0 items-center gap-2.5">
                  <BriefcaseBusiness
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="truncate">{profile.company}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="guild-card-footer mt-auto grid h-[5.25rem] grid-rows-[1.75rem_2rem] gap-2 pt-4">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {profile.opportunityStatuses.slice(0, 2).map((status) => {
                const label = GUILD.GUILD_OPPORTUNITY_STATUS_LABELS[status];

                return (
                  <span
                    key={status}
                    title={label}
                    className="min-w-0 truncate rounded-full bg-primary/10 px-2 py-1 text-[0.72rem] font-medium leading-4 text-primary"
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            <div className="flex h-8 items-center justify-between gap-3">
              {profile.resumeAvailable ? (
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground"
                  aria-label="Public resume available"
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Resume
                </span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                  View profile
                </span>
              )}

              <div
                className="pointer-events-auto flex h-8 items-center justify-end gap-1"
                role="group"
                aria-label={`${name}'s profile links`}
              >
                {externalLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${name}'s ${label}`}
                    title={label}
                    className="guild-card-action inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-background/60 text-muted-foreground transition-colors duration-150 hover:border-white/20 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
