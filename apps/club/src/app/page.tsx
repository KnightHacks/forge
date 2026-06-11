import Image from "next/image";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
import { HomeCommunityCarousel } from "./_components/home-community-carousel";
import { HomeEvents } from "./_components/home-events";

const eventsEndpoint = new URL("/api/public/club-events", env.BLADE_URL);
eventsEndpoint.searchParams.set("limit", "6");

const setApartWords = [
  { text: "Knight", tone: "gold" },
  { text: "Hacks", tone: "gold" },
  { text: "sets", tone: "white" },
  { text: "you", tone: "white" },
  { text: "apart.", tone: "white" },
] as const;

function HomeButton({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "gold" | "dark";
}) {
  const className =
    variant === "gold"
      ? "club-button bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
      : "club-button bg-[#170d1c] text-white shadow-[4px_4px_0_rgba(255,255,255,0.35)]";

  return (
    <Button asChild size="lg" className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    </Button>
  );
}

function HeroVideoBackground() {
  return (
    <div className="club-hero-media" aria-hidden="true">
      <video
        autoPlay
        disablePictureInPicture
        loop
        muted
        playsInline
        poster="/hero/club-hero-poster.webp"
        preload="auto"
      >
        <source src="/hero/club-hero.webm" type="video/webm" />
        <source src="/hero/club-hero.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function SetApartHeadline() {
  return (
    <h2
      aria-label="Knight Hacks sets you apart."
      className="club-set-apart-headline text-5xl font-black leading-tight tracking-normal md:text-7xl"
      data-reveal="kinetic-headline"
    >
      {setApartWords.map((word, wordIndex) => (
        <span
          key={word.text}
          className={`club-kinetic-word club-kinetic-word-${word.tone}`}
          style={{ "--word-index": wordIndex } as React.CSSProperties}
        >
          {word.text.split("").map((character, characterIndex) => (
            <span
              key={`${word.text}-${characterIndex}`}
              className="club-kinetic-letter"
              style={
                {
                  "--letter-index": characterIndex,
                } as React.CSSProperties
              }
            >
              {character}
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

function MascotsSection() {
  return (
    <section className="club-mascots-section relative overflow-hidden px-6 py-24 md:px-10 lg:px-24">
      <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative z-10 max-w-[34rem]" data-stagger>
          <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
            Mascots
          </p>
          <h2
            className="mt-4 text-5xl font-black leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.55)] md:text-7xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Meet T.K.</span>
            </span>
            <span className="club-line">
              <span>and Lenny</span>
            </span>
          </h2>
          <p className="text-white/78 mt-6 text-lg font-bold leading-8 md:text-xl">
            Our mascots bring the club energy to workshops, project nights, and
            hackathon weekends.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <HomeButton href="https://discord.gg/knighthacks" variant="gold">
              Join Discord
            </HomeButton>
            <HomeButton href="https://blade.knighthacks.org" variant="dark">
              Sign Up With Blade
            </HomeButton>
          </div>
        </div>

        <div className="club-mascot-image-space" aria-hidden="true" />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="club-home-bg relative overflow-hidden text-white">
      <section className="club-hero-section relative flex items-center justify-center overflow-hidden px-6 py-24 md:px-10 lg:px-24">
        <HeroVideoBackground />

        <div className="club-hero-copy relative z-10 mx-auto flex max-w-[900px] flex-col items-center text-center">
          <div className="club-hero-logo-shell">
            <Image
              src="/knighthacks.svg"
              alt="Knight Hacks"
              width={1500}
              height={504}
              priority
              className="club-hero-logo h-auto w-[17rem] md:w-[30rem] lg:w-[35rem]"
            />
          </div>
          <p
            className="club-hero-subline mt-8 text-xl font-medium leading-8 text-white/90 md:text-3xl md:leading-10"
            data-stagger
          >
            <span>UCF&apos;s largest</span>
            <span>software engineering</span>
            <span>organization and nonprofit.</span>
          </p>
          <div
            className="club-hero-actions mt-10 flex flex-wrap justify-center gap-4"
            data-stagger
          >
            <HomeButton href="https://blade.knighthacks.org" variant="gold">
              Sign Up With Blade
            </HomeButton>
            <HomeButton href="https://discord.gg/knighthacks" variant="dark">
              Join Discord
            </HomeButton>
          </div>
        </div>
      </section>

      <HomeCommunityCarousel />

      <MascotsSection />

      <section className="relative flex min-h-[42rem] items-center px-6 py-24 md:min-h-[48rem] md:px-10 lg:px-24">
        <div className="mx-auto w-full max-w-[860px] text-center">
          <h2
            className="text-4xl font-black leading-tight tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.55)] md:text-5xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Upcoming Events</span>
            </span>
          </h2>

          <HomeEvents
            allEventsHref="/events"
            eventsEndpoint={eventsEndpoint.toString()}
          />
        </div>
      </section>

      <section
        className="club-set-apart-section relative isolate overflow-hidden bg-[#09010d]"
        style={{ height: "clamp(34rem, 68svh, 46rem)", minHeight: 0 }}
      >
        <Image
          src="/knight-hacks-sets-you-apart.png"
          alt=""
          fill
          sizes="100vw"
          className="club-set-apart-image object-cover brightness-[0.86] contrast-[1.12] saturate-[0.82]"
          data-scroll-drift="28"
          style={{ objectPosition: "var(--club-set-apart-image-position)" }}
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(6,0,9,0.92)_0%,rgba(9,1,13,0.78)_14%,rgba(14,2,18,0.42)_34%,rgba(14,2,18,0.08)_58%,rgba(9,1,13,0.32)_100%)]" />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(6,0,9,0.46)_0%,rgba(9,1,13,0.22)_38%,rgba(9,1,13,0.12)_72%,rgba(9,1,13,0.34)_100%)]" />

        <div className="absolute inset-0 z-20 flex px-6 py-14 md:px-10 md:py-20 lg:px-24">
          <div className="mx-auto flex w-full max-w-[1120px] items-start pt-2 md:pt-0">
            <div className="max-w-[38rem]" data-stagger>
              <SetApartHeadline />
              <div className="mt-7 flex flex-wrap gap-4">
                <HomeButton href="https://blade.knighthacks.org" variant="gold">
                  Sign Up With Blade
                </HomeButton>
                <HomeButton
                  href="https://discord.gg/knighthacks"
                  variant="dark"
                >
                  Join Discord
                </HomeButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
