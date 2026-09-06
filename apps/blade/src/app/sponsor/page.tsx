import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Handshake,
  Mail,
  Play,
  UsersRound,
} from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { PageEntrance, RevealOnView } from "~/app/_components/shared/motion";
import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";
import { OG_IMAGE_URL, SITE_NAME, SITE_URL } from "../seo";

const SPONSOR_EMAIL = "sponsorship@knighthacks.org";
const SPONSOR_MAILTO =
  "mailto:" + SPONSOR_EMAIL + "?subject=Partnering%20with%20Knight%20Hacks";

const STATS = [
  { value: "1,000+", label: "Students" },
  { value: "36", label: "Hours" },
  { value: "185+", label: "Projects" },
  { value: "1", label: "Weekend" },
] as const;

const PARTNERSHIP_REASONS = [
  {
    icon: UsersRound,
    title: "Meet student builders",
    description:
      "Connect with ambitious students across software, hardware, design, and entrepreneurship.",
  },
  {
    icon: Code2,
    title: "Put your technology to work",
    description:
      "Bring mentors, APIs, workshops, and challenges that students can turn into working projects.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Build relationships that last",
    description:
      "Introduce students to the people behind your organization and stay connected after closing ceremony.",
  },
] as const;

const VIDEOS = [
  {
    title: "The Knight Hacks experience",
    src: "https://www.youtube.com/embed/OU1q02v1Vrw?si=dyHSQCmxzcau7-mF",
  },
  {
    title: "Built at Knight Hacks",
    src: "https://www.youtube.com/embed/OzW_4QeCfM0?si=G8SUf8UbEo2W5MnL",
  },
] as const;

const panelClassName =
  "overflow-hidden border-white/10 bg-card/95 shadow-2xl shadow-black/25";
const insetClassName = "rounded-md border border-white/10 bg-background/60";

export const metadata: Metadata = {
  title: "Sponsor Knight Hacks",
  description:
    "Partner with Knight Hacks to support more than 1,000 student builders at UCF's flagship hackathon.",
  alternates: {
    canonical: "/sponsor",
  },
  openGraph: {
    title: "Sponsor Knight Hacks",
    description:
      "Help the next generation of builders turn ambitious ideas into real projects.",
    url: SITE_URL + "/sponsor",
    siteName: SITE_NAME,
    images: [{ url: OG_IMAGE_URL }],
  },
};

export default function SponsorPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]"
      />
      <SponsorHeader />

      <div className="container relative z-10 min-w-0 px-3 pb-12 pt-4 sm:px-8 sm:pb-16 sm:pt-6 md:pt-10">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
          <PageEntrance>
            <PageHeading />
          </PageEntrance>
          <PageEntrance delay={90}>
            <SponsorOverview />
          </PageEntrance>
          <RevealOnView>
            <PartnershipPanel />
          </RevealOnView>
          <RevealOnView>
            <VideoPanel />
          </RevealOnView>
          <RevealOnView>
            <ContactPanel />
          </RevealOnView>
          <SponsorFooter />
        </div>
      </div>
    </main>
  );
}

function SponsorHeader() {
  return (
    <header className="sticky top-0 z-30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Blade home"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/blade-logo.svg"
              alt="Blade by Knight Hacks"
              width={1880}
              height={375}
              priority
              className="h-auto w-32 sm:w-44"
            />
          </Link>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <p className="hidden text-sm font-medium sm:block">Sponsorship</p>
        </div>

        <Button asChild variant="outline" className="h-11">
          <a href={SPONSOR_MAILTO}>
            <Mail aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Contact sponsorship</span>
            <span className="sm:hidden">Contact</span>
          </a>
        </Button>
      </div>
    </header>
  );
}

function PageHeading() {
  return (
    <header className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Handshake aria-hidden="true" className="size-4 shrink-0" />
          <span>Partner with Knight Hacks</span>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-normal sm:text-4xl">
          Sponsor the next generation of builders
        </h1>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
          Help more than 1,000 students at UCF turn ambitious ideas into real
          projects during our flagship 36-hour hackathon.
        </p>
      </div>

      <Button asChild size="lg" className="h-11 w-full shrink-0 sm:w-auto">
        <a href={SPONSOR_MAILTO}>
          Become a sponsor
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </Button>
    </header>
  );
}

function SponsorOverview() {
  return (
    <Card className={panelClassName}>
      <CardContent className="px-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col justify-center gap-5 p-5 sm:p-8 lg:p-10">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">
                The weekend students remember
              </p>
              <h2 className="max-w-2xl text-balance text-2xl font-semibold leading-tight sm:text-3xl">
                Give builders the tools, mentorship, and room to make something
                extraordinary.
              </h2>
              <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                Knight Hacks brings students together to learn quickly, work
                across disciplines, and ship. Partners make the experience
                possible and meet students while they are doing their best work.
              </p>
            </div>
            <p className="border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">
              Sponsor challenges, technical workshops, mentors, recruiting
              conversations, and the infrastructure behind the weekend.
            </p>
          </div>

          <div className="flex min-h-72 items-center justify-center border-t border-white/10 p-8 lg:min-h-[22rem] lg:border-l lg:border-t-0">
            <Image
              src="/knight-hacks-logo.svg"
              alt="Knight Hacks"
              width={500}
              height={500}
              priority
              className="size-48 sm:size-56"
            />
          </div>
        </div>

        <dl className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-white/10 px-5 py-5 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r"
            >
              <dd className="font-mono text-2xl font-semibold text-foreground">
                {stat.value}
              </dd>
              <dt className="mt-1 text-sm font-medium text-muted-foreground">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function PartnershipPanel() {
  return (
    <Card className={panelClassName}>
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Handshake aria-hidden="true" className="size-5 text-primary" />
          What partnership looks like
        </CardTitle>
        <CardDescription className="leading-6">
          Show up alongside students while they learn, build, and collaborate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={insetClassName}>
          {PARTNERSHIP_REASONS.map((reason) => (
            <div
              key={reason.title}
              className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:items-start"
            >
              <span className="flex size-10 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary">
                <reason.icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{reason.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VideoPanel() {
  return (
    <Card className={panelClassName}>
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play aria-hidden="true" className="size-5 text-primary" />
          See the impact
        </CardTitle>
        <CardDescription className="leading-6">
          A look inside the energy, collaboration, and projects your support
          makes possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {VIDEOS.map((video) => (
            <article key={video.src} className={insetClassName}>
              <div className="aspect-video overflow-hidden rounded-t-md border-b border-white/10 bg-black">
                <iframe
                  src={video.src}
                  title={video.title}
                  loading="lazy"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <p className="px-4 py-3 text-sm font-medium">{video.title}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactPanel() {
  return (
    <Card className={panelClassName}>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary">
            <Mail aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Ready to work together?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Tell our sponsorship team about your organization and the
              experience you want to create for students.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="h-11 w-full shrink-0 sm:w-auto">
          <a href={SPONSOR_MAILTO}>
            <Mail aria-hidden="true" className="size-4" />
            {SPONSOR_EMAIL}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function SponsorFooter() {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row">
      <p>Built by Knight Hacks at the University of Central Florida.</p>
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-md px-2 font-medium transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Return to Blade
      </Link>
    </footer>
  );
}
