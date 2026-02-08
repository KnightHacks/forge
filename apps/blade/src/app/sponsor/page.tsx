import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { SPONSOR_VIDEO_LINK } from "@forge/consts";
import { Button } from "@forge/ui/button";

export const metadata: Metadata = {
  title: "Sponsor Knight Hacks!",
  description: "Help us make dreams!",
};


const STATS = [
  { value: "1,000+", label: "Students" },
  { value: "36", label: "Hours" },
  { value: "185+", label: "Projects" },
  { value: "1", label: "Weekend" },
];

const VIDEOS = [SPONSOR_VIDEO_LINK, SPONSOR_VIDEO_LINK_2];

export default function Sponsor() {
  return (
    <main className="container mx-auto px-4 py-16 md:px-6">
      <Hero />
      <Stats />
      <Videos />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
        Partner with{" "}
        <span className="text-[hsl(var(--primary-lighter))]">Knight Hacks</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        Join us in empowering the next generation of innovators. Every year, we
        bring together{" "}
        <span className="font-semibold text-foreground">1,000+</span> students
        at UCF for a 36-hour hackathon where creativity meets technology.
      </p>
    </div>
  );
}

function Stats() {
  return (
    <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border bg-card p-4 text-center"
        >
          <div className="text-2xl font-bold text-[hsl(var(--primary-lighter))] sm:text-3xl">
            {stat.value}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function Videos() {
  return (
    <div className="mt-16">
      <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">
        See the Impact
      </h2>
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {VIDEOS.map((src) => (
          <div key={src} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-video w-full">
              <iframe
                src={src}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mx-auto mt-16 max-w-2xl text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Ready to make an impact?
      </h2>
      <p className="mt-3 text-muted-foreground">
        Connect with passionate students, showcase your brand, and help shape
        the future of tech!
      </p>
      <a href="mailto:sponsorship@knighthacks.org">
        <Button size="lg" className="mt-6">
          <Mail className="mr-2 h-5 w-5" />
          sponsorship@knighthacks.org
        </Button>
      </a>
    </div>
  );
}
