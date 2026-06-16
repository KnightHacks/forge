import Image from "next/image";
import { FaLinkedin } from "react-icons/fa";

import { Button } from "@forge/ui/button";

import { env } from "~/env";
import { HomeCommunityCarousel } from "./_components/home-community-carousel";
import { HomeEvents } from "./_components/home-events";
import { CLUB_ASSETS } from "./_lib/assets";
import { PUBLIC_LINKS } from "./_lib/site-config";

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
    <div className="club-hero-media" aria-hidden="true" data-hero-media>
      <video
        autoPlay
        disablePictureInPicture
        loop
        muted
        playsInline
        poster="/hero/club-hero-poster.webp"
        preload="metadata"
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
    <section className="club-mascots-section relative overflow-hidden px-5 py-14 sm:px-6 md:px-10 md:py-24 lg:px-24">
      <div className="mx-auto grid max-w-[1120px] items-center gap-8 md:gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div
          className="relative z-10 max-w-[30rem] md:max-w-[34rem]"
          data-stagger
        >
          <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
            Mascots
          </p>
          <h2
            className="mt-3 text-[clamp(2.85rem,12.8vw,3.65rem)] font-black leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.55)] md:mt-4 md:text-7xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>Meet T.K.</span>
            </span>
            <span className="club-line">
              <span>and Lenny</span>
            </span>
          </h2>
          <p className="text-white/78 mt-5 max-w-[21rem] text-base font-bold leading-7 md:mt-6 md:max-w-none md:text-xl md:leading-8">
            Our mascots bring the club energy to workshops, project nights, and
            hackathon weekends.
          </p>
          <div className="club-mascot-actions mt-7 hidden flex-wrap gap-4 md:mt-8 md:flex">
            <HomeButton href={PUBLIC_LINKS.discord} variant="gold">
              Join Discord
            </HomeButton>
            <HomeButton href={env.BLADE_URL} variant="dark">
              Sign Up With Blade
            </HomeButton>
          </div>
        </div>

        <div
          className="club-mascot-image-space group"
          tabIndex={0}
          aria-describedby="mascot-credit"
        >
          <div
            className="club-mascot-hotspot club-mascot-hotspot-lenny"
            aria-hidden="true"
          >
            <span>Lenny</span>
          </div>
          <div
            className="club-mascot-hotspot club-mascot-hotspot-tk"
            aria-hidden="true"
          >
            <span>T.K.</span>
          </div>
          <div
            className="club-mascot-highlight club-mascot-highlight-lenny"
            aria-hidden="true"
          />
          <div
            className="club-mascot-highlight club-mascot-highlight-tk"
            aria-hidden="true"
          />
          <Image
            src={CLUB_ASSETS.tklenny}
            alt="Lenny, the green dragon mascot, standing next to T.K., the knight mascot"
            width={3000}
            height={3000}
            className="club-mascot-image"
          />
          <div
            id="mascot-credit"
            role="note"
            aria-label="Mascot artist credit"
            className="club-mascot-credit"
          >
            <p className="text-xs font-black leading-4 text-[#23051d] md:text-sm md:leading-5">
              Made with love by Lena Tran, Design Team.
            </p>
            <a
              href={PUBLIC_LINKS.mascotArtistLinkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#7a2451] transition hover:text-[#120313]"
            >
              LinkedIn
              <FaLinkedin aria-hidden="true" className="size-2.5" />
            </a>
          </div>
        </div>

        <div className="club-mascot-actions grid grid-cols-2 gap-3 md:hidden">
          <HomeButton href={PUBLIC_LINKS.discord} variant="gold">
            Join Discord
          </HomeButton>
          <HomeButton href={env.BLADE_URL} variant="dark">
            Sign Up With Blade
          </HomeButton>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="club-home-bg relative overflow-hidden text-white">
      <section
        className="club-page-hero club-hero-section relative flex items-center justify-center overflow-hidden px-6 py-24 md:px-10 lg:px-24"
        data-hero
      >
        <HeroVideoBackground />
        <div
          className="club-page-hero-fade absolute inset-x-0 bottom-0 z-[2]"
          aria-hidden="true"
          data-hero-overlay
        />

        <div
          className="club-hero-copy relative z-10 mx-auto flex max-w-[900px] flex-col items-center text-center"
          data-hero-content
        >
          <h1 className="club-hero-logo-shell">
            <span className="sr-only">Knight Hacks</span>
            <Image
              src="/knighthacks.svg"
              alt=""
              width={1500}
              height={504}
              priority
              className="club-hero-logo h-auto w-[17rem] md:w-[30rem] lg:w-[35rem]"
            />
          </h1>
          <p
            className="club-hero-subline mt-6 text-[15px] font-medium leading-7 text-white/90 sm:text-base sm:leading-8 md:mt-8 md:text-[21px] md:leading-[34px]"
            data-stagger
          >
            <span>UCF&apos;s largest</span> <span>software engineering</span>{" "}
            <span>organization and nonprofit.</span>
          </p>
          <div
            className="club-hero-actions mt-8 grid w-full max-w-[21.5rem] grid-cols-2 gap-3 sm:mt-10 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-4"
            data-stagger
          >
            <HomeButton href={env.BLADE_URL} variant="gold">
              Sign Up With Blade
            </HomeButton>
            <HomeButton href={PUBLIC_LINKS.discord} variant="dark">
              Join Discord
            </HomeButton>
          </div>
        </div>
      </section>

      <div className="club-hero-transition-layer" aria-hidden="true" />

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
          src={CLUB_ASSETS.knightHacksSetsYouApart}
          alt=""
          fill
          sizes="100vw"
          className="club-set-apart-image object-cover brightness-[0.86] contrast-[1.12] saturate-[0.82]"
          data-scroll-drift="28"
          style={{ objectPosition: "var(--club-set-apart-image-position)" }}
        />
        <div
          className="club-set-apart-top-fade absolute inset-x-0 top-0 z-20"
          aria-hidden="true"
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(6,0,9,0.92)_0%,rgba(9,1,13,0.78)_14%,rgba(14,2,18,0.42)_34%,rgba(14,2,18,0.08)_58%,rgba(9,1,13,0.32)_100%)]" />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(6,0,9,0.46)_0%,rgba(9,1,13,0.22)_38%,rgba(9,1,13,0.12)_72%,rgba(9,1,13,0.34)_100%)]" />

        <div className="absolute inset-0 z-20 flex px-6 py-14 md:px-10 md:py-20 lg:px-24">
          <div className="mx-auto flex w-full max-w-[1120px] items-start pt-14 md:pt-20 lg:pt-24">
            <div className="max-w-[38rem]" data-stagger>
              <SetApartHeadline />
              <div className="mt-7 flex flex-wrap gap-4">
                <HomeButton href={env.BLADE_URL} variant="gold">
                  Sign Up With Blade
                </HomeButton>
                <HomeButton href={PUBLIC_LINKS.discord} variant="dark">
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
