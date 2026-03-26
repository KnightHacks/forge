"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DiscordLogoIcon as DiscordIcon } from "@radix-ui/react-icons";
import {
  BookUser,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  QrCode,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { signIn } from "@forge/auth";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

const MEMBER_ONLY_FEATURES = [
  {
    icon: CreditCard,
    title: "Optional Dues",
    description:
      "Membership is free. Dues are an optional way to go deeper and support the club financially.",
  },
  {
    icon: Users,
    title: "Team Positions",
    description:
      "Hold an officer or director role. Run projects, lead workshops, shape the club.",
  },
  {
    icon: CalendarDays,
    title: "Year-Round Events",
    description:
      "Workshops, socials, mentorship sessions, project programs, and operations meetings.",
  },
  {
    icon: BookUser,
    title: "Guild Collective",
    description:
      "Get a public profile on guild.knighthacks.org. Show off your links, resume, and KH journey.",
  },
] as const;

const HACKER_ONLY_FEATURES = [
  {
    icon: Trophy,
    title: "Free Hackathon Entry",
    description:
      "No dues, no cost. Apply, get accepted, confirm your spot, and show up ready to build.",
  },
  {
    icon: Zap,
    title: "Hackathon Dashboard",
    description:
      "Track team points, climb the live leaderboard, and see upcoming workshops in real time.",
  },
  {
    icon: Star,
    title: "Hack Points",
    description:
      "Earn points throughout the hackathon. Workshops, check-ins, and challenges all count.",
  },
  {
    icon: BookUser,
    title: "Hack Resume Database",
    description:
      "Your hacker profile feeds the KH hack resume DB, seen by sponsors at the event.",
  },
] as const;

const SHARED_FEATURES = [
  {
    icon: QrCode,
    title: "QR Check-In",
    description: "One code for all events and hackathon sessions.",
  },
  {
    icon: ClipboardList,
    title: "Smart Forms",
    description: "Fill out applications, surveys, and club forms.",
  },
  {
    icon: Star,
    title: "Points & Leaderboard",
    description: "Earn points and track your standing.",
  },
  {
    icon: CalendarDays,
    title: "Profile Management",
    description: "Keep your info, skills, and preferences current.",
  },
] as const;

const MEMBER_STEPS = [
  {
    step: "01",
    title: "Sign in with Discord",
    description: "One click, no password.",
  },
  {
    step: "02",
    title: "Apply for Membership",
    description: "Free application for UCF and Orlando-area students.",
  },
  {
    step: "03",
    title: "Join the Community",
    description:
      "Attend events, earn points, and optionally pay dues to go deeper.",
  },
  {
    step: "04",
    title: "Engage Year-Round",
    description: "Workshops, socials, projects, mentorship, and more.",
  },
] as const;

const HACKER_STEPS = [
  {
    step: "01",
    title: "Sign in with Discord",
    description: "One click, no password.",
  },
  {
    step: "02",
    title: "Apply for the Hackathon",
    description: "Open to students across the US. Completely free.",
  },
  {
    step: "03",
    title: "Confirm Your Spot",
    description: "Once accepted, confirm before the deadline.",
  },
  {
    step: "04",
    title: "Show Up & Hack",
    description: "Check in, build something, earn points, win prizes.",
  },
] as const;

export function Hero() {
  const searchParams = useSearchParams();
  const requestedCallbackURL = searchParams.get("callbackURL");
  const callbackURL =
    requestedCallbackURL?.startsWith("/forms/") === true
      ? requestedCallbackURL
      : "/dashboard";

  return (
    <div className="w-full bg-background">
      <section className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 top-0 hidden bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] dark:block" />
        <div className="absolute inset-0 block h-full w-full bg-white bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/15" />
        </div>

        <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-64px)] items-center px-4 py-20 md:px-6">
          <div className="grid w-full grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col space-y-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                For Members &amp; Hackers
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Everything Knight Hacks, in{" "}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  one platform.
                </span>
              </h1>

              <p className="max-w-prose text-lg text-muted-foreground sm:text-xl">
                Whether you&apos;re a year-round{" "}
                <span className="font-semibold text-foreground">member</span> or
                an annual{" "}
                <span className="font-semibold text-foreground">hacker</span>,{" "}
                <b>Blade</b> is your home for everything Knight Hacks.
              </p>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row">
                <form className="p-[1.5px]">
                  <Button
                    size="lg"
                    className="w-full"
                    formAction={async () => {
                      await signIn("discord", { redirectTo: callbackURL });
                    }}
                  >
                    Sign in with <DiscordIcon className="ml-1" />
                  </Button>
                </form>
                <Link href="/sponsor">
                  <div className="relative z-10 flex cursor-pointer items-center overflow-hidden rounded-md p-[1.5px] sm:w-full">
                    <div className="moving-border absolute inset-0 h-full rounded-md bg-[conic-gradient(#0ea5e9_20deg,transparent_120deg)]" />
                    <div className="relative z-20 flex w-full">
                      <Button
                        variant="secondary"
                        className="w-full hover:bg-[#E6E7E9] dark:hover:bg-[#2C3644]"
                        size="lg"
                      >
                        Sponsor us!
                      </Button>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="relative h-[25rem] w-full overflow-hidden rounded-lg sm:h-[32rem]">
              <Image
                src="/tech-knight.png"
                alt="TK mascot"
                fill
                style={{ objectFit: "contain" }}
                priority
                sizes="100%"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-muted-foreground/40 p-1">
            <div className="h-2 w-0.5 rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-border/60 py-24">
        <div className="bg-indigo-600/8 pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full blur-[100px]" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-500">
              Two audiences, one platform
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Are you a{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Member
              </span>{" "}
              or a{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">
                Hacker?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Knight Hacks has two distinct communities. Members are year-round
              UCF club participants. Hackers are hackathon attendees from across
              the US. Blade serves both.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/5 to-indigo-600/5 p-6">
              <div className="mb-6">
                <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-400">
                  Members
                </span>
                <h3 className="mt-3 text-xl font-bold">
                  UCF &amp; Orlando-area students
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Free to join. Year-round club involvement: workshops, socials,
                  project programs, and operations meetings. Hold team positions
                  and shape the club.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MEMBER_ONLY_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <Card
                      key={f.title}
                      className="border-border/40 bg-background/60"
                    >
                      <CardHeader className="pb-1 pt-4">
                        <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/15">
                          <Icon className="h-4 w-4 text-violet-500" />
                        </div>
                        <CardTitle className="text-sm">{f.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {f.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/5 to-sky-600/5 p-6">
              <div className="mb-6">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-400">
                  Hackers
                </span>
                <h3 className="mt-3 text-xl font-bold">
                  Students across the US
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hackathon attendees from anywhere in the country. No dues, no
                  cost. Apply, get accepted, show up, and build.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {HACKER_ONLY_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <Card
                      key={f.title}
                      className="border-border/40 bg-background/60"
                    >
                      <CardHeader className="pb-1 pt-4">
                        <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/15">
                          <Icon className="h-4 w-4 text-indigo-400" />
                        </div>
                        <CardTitle className="text-sm">{f.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {f.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Shared by both
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {SHARED_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-5 text-center"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10">
                      <Icon className="h-4 w-4 text-violet-400" />
                    </div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-border/60 py-24">
        <div className="bg-violet-600/8 pointer-events-none absolute left-0 top-0 h-[400px] w-[400px] rounded-full blur-[100px]" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-500">
              Getting started
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Two paths,{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                one sign-in.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8">
              <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-400">
                Member path
              </span>
              <div className="mt-6 space-y-6">
                {MEMBER_STEPS.map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
                        {item.step}
                      </div>
                      {index < MEMBER_STEPS.length - 1 && (
                        <div className="mt-2 h-full w-px bg-gradient-to-b from-violet-600/40 to-transparent" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8">
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-400">
                Hacker path
              </span>
              <div className="mt-6 space-y-6">
                {HACKER_STEPS.map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-xs font-bold text-white">
                        {item.step}
                      </div>
                      {index < HACKER_STEPS.length - 1 && (
                        <div className="mt-2 h-full w-px bg-gradient-to-b from-indigo-500/40 to-transparent" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-3">
            <div className="flex justify-center lg:col-span-1">
              <div className="relative h-[220px] w-[220px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 blur-2xl" />
                <Image
                  src="/tk-dashboard-img.svg"
                  alt="TK mascot"
                  fill
                  style={{ objectFit: "contain" }}
                  sizes="220px"
                />
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-card/60 p-6 backdrop-blur-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-violet-400">
                Member perks
              </p>
              {[
                "Free to join, no dues required",
                "Year-round workshops, socials and meetings",
                "Team positions and leadership roles",
                "Points earned at every club event",
                "Alumni Foundation membership eligibility",
              ].map((perk) => (
                <div key={perk} className="flex items-start gap-3 py-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 py-1.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <span className="text-sm">
                  Public profile on the{" "}
                  <Link
                    href="https://guild.knighthacks.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-violet-400 underline underline-offset-2 hover:text-violet-300"
                  >
                    Guild Collective
                  </Link>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-card/60 p-6 backdrop-blur-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-400">
                Hacker perks
              </p>
              {[
                "Completely free, no dues required",
                "Open to students across the US",
                "Hackathon dashboard & team points",
                "Live leaderboard & workshop schedule",
                "Personal QR code for check-in",
                "Hack resume database visibility",
              ].map((perk) => (
                <div key={perk} className="flex items-start gap-3 py-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-border/60 py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/15" />
        </div>
        <div className="container relative z-10 mx-auto flex flex-col items-center px-4 text-center md:px-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-500">
            Ready?
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Your Knight Hacks journey{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              starts here.
            </span>
          </h2>
          <p className="mb-10 max-w-xl text-lg text-muted-foreground">
            Join the Knight Hacks community. Whether you&apos;re building
            year-round or shipping something incredible at a hackathon.
          </p>
          <form>
            <Button
              size="lg"
              className="px-10 text-base"
              formAction={async () => {
                await signIn("discord", { redirectTo: "/dashboard" });
              }}
            >
              Sign in with Discord <DiscordIcon className="ml-2" />
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Members: UCF &amp; Orlando area &middot; Hackers: open to all US
            students &middot; No spam, ever
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <div className="flex items-center">
            <Image
              className="hidden dark:block"
              src="/blade-banner.svg"
              alt="Blade"
              width={0}
              height={0}
              style={{ width: "auto", height: "26px" }}
            />
            <Image
              className="block dark:hidden"
              src="/black-kh-title-logo.svg"
              alt="Blade"
              width={0}
              height={0}
              style={{ width: "auto", height: "26px" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Knight Hacks &middot; University
            of Central Florida &middot;{" "}
            <Link
              href="/sponsor"
              className="underline-offset-2 hover:underline"
            >
              Sponsor us
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
