import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowDown,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Github,
  Globe2,
  History,
  Linkedin,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { DiscordSignInLink } from "~/app/_components/auth/discord-sign-in-link";
import {
  ClosingCallToAction,
  EditorialCopy,
  landingInsetClassName as insetClassName,
  LandingFooter,
  landingPanelClassName as panelClassName,
} from "~/app/_components/public/member-landing-support";
import { GUILD_URL } from "~/lib/guild-urls";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Blade | Knight Hacks Member Portal",
  description:
    "Join Knight Hacks, find upcoming events, manage your membership, and keep your member profile current with Blade.",
};

export default async function HomePage() {
  const session = await auth();

  if (session) redirect(MEMBER_DASHBOARD_PATH);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"
      />

      <Hero />

      <div className="relative z-10">
        <MemberHomeIntro />
        <EventsBand />
        <CheckInBand />
        <GuildBand />
        <ContinuityPanel />
        <ClosingCallToAction />
        <LandingFooter />
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section className="container relative z-10 grid min-h-[100svh] items-center gap-8 px-4 py-10 sm:px-8 md:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.8fr)] md:py-14 lg:gap-12">
      <div className="space-y-7">
        <Image
          src="/blade-logo.svg"
          alt="Blade by Knight Hacks"
          width={1880}
          height={375}
          priority
          className="h-auto w-56 sm:w-64"
        />

        <div className="max-w-3xl space-y-5">
          <h1 className="text-balance text-4xl font-semibold tracking-normal text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Your Knight Hacks membership,{" "}
            <span className="text-primary">all in one place.</span>
          </h1>
          <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground md:text-xl">
            Use Blade to join the club, see upcoming events, check in, pay dues,
            and update your member profile.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <DiscordSignInLink className="h-12 gap-2 px-6 text-base">
              Sign in with Discord
            </DiscordSignInLink>
            <div className="relative z-10 overflow-hidden rounded-md p-[1.5px]">
              <div
                aria-hidden="true"
                className="moving-border absolute inset-0 bg-[conic-gradient(#0ea5e9_20deg,transparent_120deg)] motion-reduce:hidden"
              />
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="relative z-20 h-12 w-full px-6 text-base"
              >
                <a href="#member-home">
                  See what&apos;s inside
                  <ArrowDown aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            First time here? Blade opens the member signup form after you sign
            in.
          </p>
        </div>
      </div>

      <div className="relative min-h-[20rem] sm:min-h-[26rem] md:min-h-[34rem]">
        <Image
          src="/tech-knight.png"
          alt="Tech Knight"
          fill
          priority
          sizes="(min-width: 768px) 44vw, 92vw"
          className="object-contain object-center"
        />
      </div>
    </section>
  );
}

function MemberHomeIntro() {
  return (
    <section
      id="member-home"
      className="container scroll-mt-8 px-4 pb-5 pt-12 sm:px-8 sm:pb-6 sm:pt-16"
    >
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles aria-hidden="true" className="size-4" />
          <span>Member portal</span>
        </div>
        <h2 className="mt-2 max-w-3xl text-balance text-3xl font-semibold tracking-normal sm:text-4xl">
          What you can do in Blade
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-base leading-7 text-muted-foreground">
          Blade is the Knight Hacks member portal. Your dashboard has club
          events, attendance, dues, forms, and the profile information you share
          on Guild.
        </p>
      </div>
    </section>
  );
}

function EventsBand() {
  return (
    <section className="container px-4 py-2 sm:px-8 sm:py-3">
      <Card className={panelClassName}>
        <CardContent className="px-0">
          <div className="grid lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
            <div className="p-5 sm:p-6 lg:p-8">
              <EditorialCopy
                icon={CalendarDays}
                eyebrow="Events"
                title="See events and attendance."
                description="The Events page lists the date, time, location, Discord post, and Google Calendar link for each club event. After check-in, Blade adds the event and its points to your attendance history."
              />
            </div>
            <div className="border-t border-white/10 bg-background/30 p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <CalendarDays
                      aria-hidden="true"
                      className="size-5 text-primary"
                    />
                    Member schedule
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upcoming events and your check-in history.
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled>
                  View all
                </Button>
              </div>
              <div className={"mt-4 " + insetClassName}>
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
                  <Badge variant="outline" className="border-primary/30">
                    Upcoming
                  </Badge>
                  <span className="text-sm font-semibold">Event details</span>
                </div>
                <div className="grid gap-3 p-4 text-sm text-muted-foreground sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Clock3
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                    Date and time
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                    Campus location
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium">
                    <MessageCircle aria-hidden="true" className="size-4" />
                    Open in Discord
                  </span>
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    Add to calendar
                  </span>
                </div>
              </div>

              <div
                className={
                  insetClassName +
                  " mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                }
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary">
                    <History aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Attendance history</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Each check-in shows the event and points awarded.
                    </p>
                  </div>
                </div>
                <Trophy
                  aria-label="Event points recorded"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function CheckInBand() {
  return (
    <section className="container px-4 py-2 sm:px-8 sm:py-3">
      <Card className={panelClassName}>
        <CardContent className="px-0">
          <div className="grid lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
            <div className="p-5 sm:p-6 lg:p-8">
              <EditorialCopy
                icon={QrCode}
                eyebrow="Check-in and dues"
                title="QR check-in and dues status."
                description="Your dashboard includes a member QR for club event check-in. It also shows whether dues are paid for the current academic year and links to payment when needed."
              />
            </div>
            <div className="grid gap-4 border-t border-white/10 bg-background/30 p-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex min-h-60 flex-col items-center justify-center rounded-md border border-[hsl(var(--guild-gold)/0.3)] bg-[hsl(var(--guild-gold)/0.1)] p-5 text-center">
                <div className="flex size-28 items-center justify-center rounded-md border border-[hsl(var(--guild-gold)/0.35)] bg-background/70 text-[hsl(var(--guild-gold))] shadow-lg shadow-black/20">
                  <QrCode aria-hidden="true" className="size-20" />
                </div>
                <p className="mt-4 text-sm font-semibold">Your member QR</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open it from your dashboard.
                </p>
              </div>

              <div className="flex flex-col justify-center gap-3">
                <div className={insetClassName + " p-4"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CreditCard
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      <div>
                        <p className="text-sm font-semibold">Dues status</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Blade shows Paid or Unpaid for the current academic
                          year.
                        </p>
                      </div>
                    </div>
                    <CheckCircle2
                      aria-label="Status visible"
                      className="size-5 shrink-0 text-[hsl(var(--chart-2))]"
                    />
                  </div>
                </div>
                <div className={insetClassName + " p-4"}>
                  <div className="flex items-start gap-3">
                    <QrCode
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        Club event check-in
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Use the same QR from your phone or desktop.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function GuildBand() {
  const profileLinks = [
    { icon: Github, label: "GitHub" },
    { icon: Linkedin, label: "LinkedIn" },
    { icon: Globe2, label: "Portfolio" },
  ] as const;

  return (
    <section className="container px-4 py-2 sm:px-8 sm:py-3">
      <Card className={panelClassName}>
        <CardContent className="px-0">
          <div className="grid lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
            <div className="p-5 sm:p-6 lg:p-8">
              <EditorialCopy
                icon={UsersRound}
                eyebrow="Member profile"
                title="Edit your Guild profile."
                description="Blade is where you update your photo, bio, company, links, resume, and opportunity preferences. You choose whether your profile, location, and resume appear on Guild."
                action={
                  <Button asChild variant="outline" className="h-11">
                    <a href={GUILD_URL} target="_blank" rel="noreferrer">
                      Open Guild
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </a>
                  </Button>
                }
              />
            </div>
            <div className="border-t border-white/10 bg-background/30 p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-base font-semibold">
                <UserRound aria-hidden="true" className="size-5 text-primary" />
                Your Guild profile
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Profile details managed in Blade.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div
                  className={
                    insetClassName +
                    " flex flex-col items-center justify-center p-5 text-center"
                  }
                >
                  <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-primary/15 ring-1 ring-white/15">
                    <Image
                      src="/knight-hacks-logo.svg"
                      alt=""
                      width={500}
                      height={500}
                      className="size-14"
                    />
                  </div>
                  <p className="mt-4 text-base font-semibold">Your name</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your member tagline
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-3 border-primary/30 bg-primary/10 text-primary"
                  >
                    Visibility settings
                  </Badge>
                </div>

                <div className="grid content-start gap-3">
                  <div className={insetClassName + " p-4"}>
                    <p className="text-sm font-semibold">Links</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {profileLinks.map((link) => (
                        <span
                          key={link.label}
                          className="flex min-h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-muted-foreground"
                        >
                          <link.icon aria-hidden="true" className="size-4" />
                          {link.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={insetClassName + " p-4"}>
                    <div className="flex items-start gap-3">
                      <FileText
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Resume and experience
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Keep recruiting context current and choose whether
                          your resume appears publicly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ContinuityPanel() {
  const items = [
    {
      icon: History,
      title: "Attendance",
      description: "See the club events where you checked in.",
    },
    {
      icon: Trophy,
      title: "Event points",
      description: "See points recorded for each check-in.",
    },
    {
      icon: FileText,
      title: "Previous forms",
      description: "Review responses you already submitted.",
    },
    {
      icon: MessageCircle,
      title: "Feedback",
      description: "Complete event feedback before it closes.",
    },
  ] as const;

  return (
    <section className="container px-4 py-2 sm:px-8 sm:py-3">
      <Card className={panelClassName}>
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-xl">
            Your member history stays in Blade.
          </CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            Review previous activity from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.title}
                className="border-b border-white/10 px-5 py-5 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r"
              >
                <item.icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
