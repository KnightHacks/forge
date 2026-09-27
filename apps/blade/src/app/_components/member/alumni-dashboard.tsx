"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Crown,
  HeartHandshake,
  Mail,
  MessageCircle,
  Settings,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";

import { cn } from "@forge/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { MarkdownContent } from "@forge/ui/markdown-content";

import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";
import { MemberQRCodeDialog } from "./member-qr-code-dialog";

const alumniDiscordUrl =
  "https://discord.com/channels/486628710443778071/1052981290267312248";

const donationOptions = [
  {
    href: "https://buy.stripe.com/6oU28q3Hm8Rm2rd5aOcfK0d",
    label: "$20",
  },
  {
    href: "https://buy.stripe.com/bJe14m3Hmd7CfdZbzccfK0e",
    label: "$30",
  },
  {
    href: "https://buy.stripe.com/7sYcN4dhW6Jegi35aOcfK0f",
    label: "$50",
  },
  {
    href: "https://buy.stripe.com/8x228qa5K1oUe9VdHkcfK0c",
    label: "Custom",
  },
] as const;

export interface AlumniBulletinCardData {
  body: string | null;
  ctaLabel: string | null;
  externalUrl: string | null;
  formId: string | null;
  formSlug?: string | null;
  id: string;
  imageAlt: string | null;
  imageUrl: string | null;
  title: string;
}

export interface AlumniOfficerData {
  discordUserId: string | null;
  email: string;
  name: string;
  office: string;
  profilePictureUrl: string | null;
  userId: string;
}

export interface AlumniDashboardData {
  bulletin: AlumniBulletinCardData[];
  career: {
    currentEmployer: string | null;
    currentTitle: string | null;
    historyCount: number;
  };
  officers: AlumniOfficerData[];
  recap: {
    classOf: number;
    clubEventCount?: number;
    firstClubEvent?: {
      name: string;
      occurredAt: string;
    };
    lifetimePoints?: number;
    memberSince: number;
    mostActiveSemester?: string;
    mostAttendedTag?: string;
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ActionSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AlumniBulletinCard({ post }: { post: AlumniBulletinCardData }) {
  const actionHref = post.externalUrl
    ? post.externalUrl
    : post.formSlug
      ? `/form/${encodeURIComponent(post.formSlug)}`
      : null;
  const external = Boolean(post.externalUrl);

  return (
    <article className="grid overflow-hidden rounded-lg border border-white/10 bg-background/60 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 p-4 md:p-5">
        <h3 className="text-base font-semibold md:text-lg">{post.title}</h3>
        {post.body ? (
          <MarkdownContent className="mt-2 text-sm leading-6 text-muted-foreground">
            {post.body}
          </MarkdownContent>
        ) : null}
        {actionHref && post.ctaLabel ? (
          <Button asChild size="sm" className="mt-4 min-h-10 gap-2">
            <a
              href={actionHref}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
            >
              {post.ctaLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </div>
      {post.imageUrl && post.imageAlt ? (
        <div className="relative aspect-[16/9] min-h-36 border-t border-white/10 sm:aspect-auto sm:h-full sm:w-56 sm:border-l sm:border-t-0 lg:w-72">
          <Image
            unoptimized
            fill
            sizes="(min-width: 1024px) 18rem, (min-width: 640px) 14rem, 100vw"
            src={post.imageUrl}
            alt={post.imageAlt}
            className="object-cover"
          />
        </div>
      ) : null}
    </article>
  );
}

function RecapMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-border/70 px-3 first:border-l-0 md:px-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function AlumniDashboard({
  dashboard,
  firstName,
}: {
  dashboard: AlumniDashboardData;
  firstName: string;
}) {
  const optionalRecap = [
    dashboard.recap.lifetimePoints
      ? {
          icon: Trophy,
          label: "Lifetime points",
          value: dashboard.recap.lifetimePoints.toLocaleString(),
        }
      : null,
    dashboard.recap.clubEventCount
      ? {
          icon: Sparkles,
          label: "Club events",
          value: dashboard.recap.clubEventCount.toLocaleString(),
        }
      : null,
    dashboard.recap.mostActiveSemester
      ? {
          icon: CalendarDays,
          label: "Most active",
          value: dashboard.recap.mostActiveSemester,
        }
      : null,
    dashboard.recap.mostAttendedTag
      ? {
          icon: HeartHandshake,
          label: "Top interest",
          value: dashboard.recap.mostAttendedTag,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <main
      data-alumni-dashboard-layout="screen-height"
      className="container px-3 py-3 sm:px-6 sm:py-5 lg:h-[calc(100svh-4rem)] lg:overflow-hidden lg:px-8"
    >
      <div className="flex min-h-full flex-col gap-3 lg:h-full lg:min-h-0">
        <header className="flex shrink-0 flex-col gap-3 rounded-lg border border-white/10 bg-card/95 px-4 py-3 shadow-xl shadow-black/15 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Alumni home</p>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-normal sm:text-2xl">
              Welcome back, {firstName}.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <MemberQRCodeDialog triggerClassName="min-h-11" />
            <Button
              asChild
              variant="outline"
              size="md"
              className="min-h-11 gap-2"
            >
              <Link href="/member/settings">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </Button>
          </div>
        </header>

        <section
          data-alumni-primary-actions="always-visible"
          className="grid shrink-0 gap-3 lg:grid-cols-[1.15fr_0.85fr_1fr]"
          aria-label="Alumni actions"
        >
          <ActionSurface className="border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.13),hsl(var(--card))_58%)]">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h2 className="font-semibold">Support Knight Hacks</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Help fund the next class of builders.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {donationOptions.map((option) => (
                <Button
                  key={option.label}
                  asChild
                  variant="outline"
                  size="sm"
                  className="min-h-10 px-2"
                >
                  <a href={option.href} target="_blank" rel="noreferrer">
                    {option.label}
                  </a>
                </Button>
              ))}
            </div>
          </ActionSurface>

          <ActionSurface>
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Alumni Discord</h2>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              Stay close to the community and other alumni.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-3 min-h-10 w-full gap-2"
            >
              <a href={alumniDiscordUrl} target="_blank" rel="noreferrer">
                Join the alumni Discord
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </ActionSurface>

          <ActionSurface>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h2 className="font-semibold">Career history</h2>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {dashboard.career.currentEmployer
                ? `${dashboard.career.currentTitle ?? "Current role"} at ${dashboard.career.currentEmployer}`
                : dashboard.career.historyCount > 0
                  ? `${dashboard.career.historyCount} saved experience${dashboard.career.historyCount === 1 ? "" : "s"}`
                  : "Tell the community where your career has taken you."}
            </p>
            <Button asChild size="sm" className="mt-3 min-h-10 w-full gap-2">
              <Link href="/member/settings#career">
                Update career history
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </ActionSurface>
        </section>

        <section className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(32rem,1.25fr)]">
          <ActionSurface className="overflow-hidden p-0">
            <div className="border-b border-border/70 px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                Your Knight Hacks recap
              </h2>
            </div>
            <dl className="grid grid-cols-2 gap-y-3 px-1 py-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
              <RecapMetric
                icon={CalendarDays}
                label="Member since"
                value={dashboard.recap.memberSince}
              />
              <RecapMetric
                icon={Crown}
                label="Class of"
                value={dashboard.recap.classOf}
              />
              {optionalRecap.map((item) => (
                <RecapMetric key={item.label} {...item} />
              ))}
            </dl>
          </ActionSurface>

          <ActionSurface className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
                Current officers
              </h2>
              <Badge variant="outline" className="text-muted-foreground">
                Here to help
              </Badge>
            </div>
            {dashboard.officers.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
                {dashboard.officers.map((officer) => (
                  <article
                    key={`${officer.office}-${officer.userId}`}
                    className="flex min-w-60 flex-1 items-center gap-3 rounded-md border border-white/10 bg-background/60 p-2.5"
                  >
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage
                        src={officer.profilePictureUrl ?? undefined}
                        alt=""
                      />
                      <AvatarFallback className="text-xs font-semibold text-primary">
                        {initials(officer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {officer.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {officer.office}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <a
                        href={`mailto:${officer.email}`}
                        aria-label={`Email the ${officer.office}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </a>
                      {officer.discordUserId ? (
                        <a
                          href={`https://discord.com/users/${officer.discordUserId}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${officer.name} on Discord`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MessageCircle
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Officer contacts are being updated.
              </p>
            )}
          </ActionSurface>
        </section>

        <Card className="min-h-72 gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/20 lg:min-h-0 lg:flex-1">
          <CardHeader className="shrink-0 border-b border-border/70 px-4 py-3 md:px-5">
            <div>
              <h2 className="font-semibold">Bulletin</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ways to reconnect, volunteer, and move Knight Hacks forward.
              </p>
            </div>
          </CardHeader>
          <CardContent
            data-alumni-bulletin-overflow="owned"
            className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4"
          >
            {dashboard.bulletin.length > 0 ? (
              <div className="grid gap-3">
                {dashboard.bulletin.map((post) => (
                  <AlumniBulletinCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-white/10 bg-background/40 px-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing needs your attention right now.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
