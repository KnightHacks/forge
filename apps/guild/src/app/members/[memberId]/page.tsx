import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Github, Globe2, Linkedin } from "lucide-react";

import { GUILD } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

import { ProfileMotion } from "~/app/_components/profile-motion";
import { ResumeActions } from "~/app/_components/resume-button";
import { SiteHeader } from "~/app/_components/site-header";
import { api } from "~/trpc/server";

interface ProfilePageProps {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getProfile(memberId: string) {
  try {
    return await api.guild.getProfile({ memberId });
  } catch {
    notFound();
  }
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { memberId } = await params;

  try {
    const profile = await api.guild.getProfile({ memberId });
    const name = `${profile.firstName} ${profile.lastName}`.trim();

    return {
      title: name,
      description:
        profile.tagline ??
        `${name} is part of the Knight Hacks Guild Collective.`,
      alternates: {
        canonical: `/members/${profile.id}`,
      },
      openGraph: {
        title: `${name} | Guild Collective`,
        description:
          profile.tagline ??
          `${name} is part of the Knight Hacks Guild Collective.`,
        url: `/members/${profile.id}`,
        images: profile.profilePictureUrl
          ? [{ url: profile.profilePictureUrl, alt: name }]
          : undefined,
      },
    };
  } catch {
    return { title: "Profile not found", robots: { index: false } };
  }
}

function graduationLabel(gradDate: string, alumni: boolean) {
  const label = new Date(`${gradDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
  return alumni ? `Graduated ${label}` : `Graduating ${label}`;
}

function memberSinceLabel(memberSinceDate: string) {
  return new Date(`${memberSinceDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

function guildReturnPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "/" || candidate?.startsWith("/?")) return candidate;
  return "/";
}

export default async function GuildProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { memberId } = await params;
  const returnTo = guildReturnPath((await searchParams).from);
  const profile = await getProfile(memberId);
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.at(0) ?? ""}${
    profile.lastName.at(0) ?? ""
  }`;
  const links = [
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
  const isAlumni = profile.memberStatus === "alumni";
  const profileStyle = {
    "--role-accent": profile.roleCallout?.color ?? "hsl(var(--guild-blue))",
  } as CSSProperties;

  return (
    <div className="guild-shell">
      <SiteHeader />
      <main className="container py-5 md:flex md:h-[calc(100svh-4rem)] md:min-h-0 md:flex-col md:py-6">
        <div className="mx-auto mb-4 w-full max-w-5xl md:shrink-0">
          <Button asChild variant="ghost" className="-ml-3 gap-2">
            <Link href={returnTo}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to the Guild
            </Link>
          </Button>
        </div>

        <ProfileMotion
          className="guild-profile-card mx-auto w-full max-w-5xl overflow-hidden rounded-xl md:min-h-0 md:flex-1"
          style={profileStyle}
        >
          <div className="grid gap-8 p-5 sm:p-7 md:h-full md:min-h-0 md:grid-cols-[12rem_minmax(0,1fr)] md:p-8">
            <div className="md:min-h-0">
              {profile.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profilePictureUrl}
                  alt={`${name}'s profile`}
                  className="guild-card-image aspect-square w-32 rounded-lg object-cover ring-1 ring-white/15 sm:w-40 md:w-full"
                />
              ) : (
                <div className="flex aspect-square w-32 items-center justify-center rounded-lg bg-primary/15 text-3xl font-semibold text-primary ring-1 ring-primary/25 sm:w-40 md:w-full">
                  {initials}
                </div>
              )}

              <div className="mt-4 grid gap-2">
                {profile.roleCallout ? (
                  <div className="guild-status-surface guild-team-status flex min-h-11 items-center rounded-md border-l-2 px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground/90">
                      {profile.roleCallout.label}
                    </p>
                  </div>
                ) : null}
                {isAlumni ? (
                  <div className="guild-status-surface guild-alumni-badge flex min-h-11 items-center rounded-md px-3 py-2.5">
                    <p className="text-sm font-semibold">
                      Alumni · {profile.gradDate.slice(0, 4)}
                    </p>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="w-fit border-white/10 bg-background/60"
                  >
                    Current member
                  </Badge>
                )}
              </div>
            </div>

            <div className="guild-profile-scroll min-w-0 md:min-h-0 md:overflow-y-auto md:pr-2">
              <header>
                <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-5xl">
                  {name}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {profile.tagline ?? "Knight Hacks community member"}
                </p>
              </header>

              <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
                <ProfileFact label="Major">{profile.major}</ProfileFact>
                <ProfileFact label="School">{profile.school}</ProfileFact>
                <ProfileFact label="Graduation">
                  {graduationLabel(profile.gradDate, isAlumni)}
                </ProfileFact>
                <ProfileFact label="Member since">
                  {memberSinceLabel(profile.memberSinceDate)}
                </ProfileFact>
                {profile.company ? (
                  <ProfileFact label="Company">{profile.company}</ProfileFact>
                ) : null}
              </div>

              {profile.opportunityStatuses.length > 0 ? (
                <section
                  className="guild-profile-section mt-8 rounded-lg p-4"
                  aria-labelledby="opportunities-title"
                >
                  <h2
                    id="opportunities-title"
                    className="text-sm font-semibold"
                  >
                    Open to
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.opportunityStatuses.map((status) => (
                      <Badge
                        key={status}
                        className="bg-primary/15 text-primary hover:bg-primary/15"
                      >
                        {GUILD.GUILD_OPPORTUNITY_STATUS_LABELS[status]}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              {profile.about ? (
                <section
                  className="guild-profile-section mt-4 rounded-lg p-4"
                  aria-labelledby="about-title"
                >
                  <h2 id="about-title" className="text-sm font-semibold">
                    About
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground/90">
                    {profile.about}
                  </p>
                </section>
              ) : null}

              {links.length > 0 ? (
                <section
                  className="guild-profile-section mt-4 rounded-lg p-4"
                  aria-labelledby="links-title"
                >
                  <h2 id="links-title" className="text-sm font-semibold">
                    Elsewhere
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {links.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Button
                          key={link.label}
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <a href={link.href} target="_blank" rel="noreferrer">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {link.label}
                          </a>
                        </Button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {profile.resumeAvailable ? (
                <section
                  className="guild-profile-section mt-4 rounded-lg p-4 sm:p-5"
                  aria-labelledby="resume-title"
                >
                  <h2 id="resume-title" className="font-semibold">
                    Resume
                  </h2>
                  <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
                    Preview this member’s public resume in a new tab or download
                    a copy.
                  </p>
                  <ResumeActions memberId={profile.id} />
                </section>
              ) : null}
            </div>
          </div>
        </ProfileMotion>
      </main>
    </div>
  );
}

function ProfileFact({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="guild-profile-fact min-w-0 rounded-md px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground/90">
        {children}
      </p>
    </div>
  );
}
