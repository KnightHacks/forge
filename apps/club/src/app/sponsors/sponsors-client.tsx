"use client";

import type { ImageLoaderProps } from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import { CLUB_ASSETS } from "../_lib/assets";
import { PUBLIC_LINKS } from "../_lib/site-config";
import {
  FALLBACK_SPONSOR_LOGO_CDN_ROOT,
  FAQ_ITEMS,
  FEATURED_SUPPORTER_SLIDES,
  ONLINE_SPONSOR_LOGOS,
  PAST_SPONSORS,
  SPONSOR_WEBSITE_URLS,
} from "./sponsors-config";

const sponsorLogoLoader = ({ src }: ImageLoaderProps) => src;
const textOnlySponsorLogoKeys = new Set([
  "gamer development knights",
  "gdk",
  "morgan",
  "morgan and morgan",
]);
const sponsorTileClassName =
  "club-sponsor-tile bg-[#2b0d35]/64 border-white/12 group flex min-h-24 items-center justify-center border-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.2)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--club-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--club-plum)]";

interface SponsorLogoRecord {
  id: string;
  logoUrl?: string;
  name: string;
  websiteUrl?: string;
}

function normalizeSponsorKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/@/g, " at ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sortSponsorsByName<T extends { name: string }>(
  sponsors: readonly T[],
) {
  return [...sponsors].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function getSponsorLogoFileName(logoUrl: string) {
  const trimmedLogoUrl = logoUrl.trim();

  try {
    return new URL(trimmedLogoUrl).pathname.split("/").pop() ?? "";
  } catch {
    return trimmedLogoUrl.split("/").pop() ?? "";
  }
}

function isSvgLogoUrl(logoUrl: string) {
  return /\.svg(?:[?#].*)?$/i.test(logoUrl.trim());
}

function normalizeSponsorLogoUrl(sponsor: SponsorLogoRecord) {
  const sponsorKey = normalizeSponsorKey(sponsor.name);

  if (textOnlySponsorLogoKeys.has(sponsorKey)) {
    return undefined;
  }

  const sponsorLogoUrl = ONLINE_SPONSOR_LOGOS[sponsorKey];

  if (sponsorLogoUrl) {
    return sponsorLogoUrl;
  }

  const rawLogoUrl = sponsor.logoUrl ?? "";
  const logoFileName = getSponsorLogoFileName(rawLogoUrl);
  const logoName = logoFileName.replace(/\.[^.]+$/, "");
  const logoUrl = ONLINE_SPONSOR_LOGOS[normalizeSponsorKey(logoName)];

  if (logoUrl) {
    return logoUrl;
  }

  if (isSvgLogoUrl(rawLogoUrl)) {
    if (/^https?:\/\//i.test(rawLogoUrl)) {
      return rawLogoUrl.trim();
    }

    return encodeURI(`${FALLBACK_SPONSOR_LOGO_CDN_ROOT}/${logoFileName}`);
  }

  return undefined;
}

function SponsorLogo({
  sponsor,
  priority = false,
}: {
  sponsor: SponsorLogoRecord;
  priority?: boolean;
}) {
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | undefined>();
  const logoSrc = normalizeSponsorLogoUrl(sponsor);

  if (!logoSrc || failedLogoSrc === logoSrc) {
    return (
      <span className="flex h-14 w-44 max-w-full items-center justify-center px-3 text-center text-sm font-black uppercase leading-tight text-white md:text-base">
        {sponsor.name}
      </span>
    );
  }

  return (
    <span className="flex h-14 w-44 max-w-full items-center justify-center">
      <Image
        src={logoSrc}
        alt={`${sponsor.name} logo`}
        width={360}
        height={140}
        loader={sponsorLogoLoader}
        unoptimized
        priority={priority}
        onError={() => setFailedLogoSrc(logoSrc)}
        className="h-full w-full object-contain p-1 brightness-0 invert transition duration-200 group-hover:scale-[1.03]"
        sizes="176px"
      />
    </span>
  );
}

function SponsorTile({
  sponsor,
  priority = false,
}: {
  sponsor: SponsorLogoRecord;
  priority?: boolean;
}) {
  const content = <SponsorLogo sponsor={sponsor} priority={priority} />;

  if (sponsor.websiteUrl) {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${sponsor.name} website`}
        className={sponsorTileClassName}
      >
        {content}
      </a>
    );
  }

  return <div className={sponsorTileClassName}>{content}</div>;
}

function Hero({ sponsorUrl }: { sponsorUrl: string }) {
  return (
    <section
      className="club-page-hero relative isolate min-h-[100svh] overflow-hidden bg-[#110214] px-6 pt-20 text-center md:px-10 lg:px-24"
      data-hero
    >
      <Image
        src={CLUB_ASSETS.sponsorSessionStudents}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover object-[38%_center] brightness-[0.88] contrast-[1.04] saturate-[1.02] md:object-[67%_center]"
        data-hero-media
      />
      <div
        className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(11,0,14,0.46)_0%,rgba(11,0,14,0.34)_30%,rgba(11,0,14,0.18)_62%,rgba(11,0,14,0.28)_100%)]"
        data-hero-overlay
      />
      <div
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(11,0,14,0.72)_0%,rgba(11,0,14,0.1)_32%,rgba(17,2,20,0.12)_64%,#140422_100%)]"
        data-hero-overlay
      />
      <div
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_26%_42%,rgba(255,182,43,0.16)_0%,rgba(247,79,131,0.08)_32%,transparent_62%)]"
        data-hero-overlay
      />
      <div
        className="club-page-hero-fade absolute inset-x-0 bottom-0 z-[1]"
        data-hero-overlay
      />

      <div
        className="club-hero-logo-aligned-content relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[1060px] flex-col items-center justify-start pb-16 text-center"
        data-hero-content
        data-stagger
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] [text-shadow:3px_3px_0_rgba(0,0,0,0.52)] md:text-sm">
          Sponsors & Partners
        </p>
        <h1
          className="mx-auto mt-5 text-[56px] font-black uppercase leading-none tracking-normal text-white [text-shadow:7px_7px_0_rgba(0,0,0,0.48)] md:text-[88px] lg:text-[96px]"
          data-reveal="headline-ladder"
        >
          <span className="club-line">
            <span>Our Supporters</span>
          </span>
        </h1>
        <p className="text-white/86 mx-auto mt-7 max-w-[650px] text-base font-medium leading-8 md:text-[21px] md:leading-[34px]">
          Sponsors help students learn, ship, meet teams, and turn campus space
          into a real builder community.
        </p>

        <Button asChild className="club-button club-button-pink mt-10 px-8">
          <a href={sponsorUrl} target="_blank" rel="noopener noreferrer">
            Become a Sponsor
            <ArrowRight aria-hidden="true" className="ml-2 size-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}

function SponsorHighlight({
  slides,
  selectedIndex,
  onPrevious,
  onNext,
}: {
  slides: typeof FEATURED_SUPPORTER_SLIDES;
  selectedIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const selectedSlide = slides[selectedIndex] ?? slides[0];

  return (
    <section className="club-post-hero-section relative px-6 pb-24 md:px-10">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[0.95fr_1fr]">
        <div>
          <div
            className={cn(
              "bg-[#1d1325]/88 relative aspect-[1.62] overflow-hidden border-[3px] transition duration-300",
              selectedSlide.frameClassName,
            )}
          >
            <div
              key={selectedSlide.id}
              className="animate-in fade-in absolute inset-0 duration-500"
            >
              <Image
                src={selectedSlide.imageSrc}
                alt={selectedSlide.alt}
                fill
                sizes="(min-width: 1024px) 30rem, (min-width: 768px) 42vw, 88vw"
                className="object-cover transition duration-300"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous highlight image"
              className="text-white/72 flex size-8 items-center justify-center transition hover:text-[var(--club-gold)] disabled:opacity-35"
              onClick={onPrevious}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <div className="flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: slides.length }, (_, index) => (
                <span
                  key={slides[index]?.id ?? `highlight-dot-${index}`}
                  className={cn(
                    "bg-white/28 block size-2 rounded-full",
                    index === selectedIndex && selectedSlide.dotClassName,
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next highlight image"
              className="text-white/72 flex size-8 items-center justify-center transition hover:text-[var(--club-gold)] disabled:opacity-35"
              onClick={onNext}
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div data-stagger>
          <p
            className={cn(
              "club-supporter-eyebrow inline-block origin-left transform-gpu px-3 py-1 text-2xl font-black uppercase leading-none md:text-4xl",
              selectedSlide.accentClassName,
            )}
            style={
              {
                "--supporter-eyebrow-rotate": selectedSlide.eyebrowTilt,
              } as CSSProperties
            }
          >
            {selectedSlide.eyebrow}
          </p>
          <h2
            className={cn(
              "mt-3 border-b-4 pb-2 text-4xl font-black uppercase leading-none text-white md:text-5xl",
              selectedSlide.lineClassName,
            )}
          >
            {selectedSlide.title}
          </h2>
          <p className="mt-7 max-w-xl text-sm font-semibold leading-7 text-[#dfd2ea]">
            {selectedSlide.description}
          </p>
        </div>
      </div>
    </section>
  );
}

function PastSponsorGrid() {
  return (
    <section
      className="container pb-24 md:pb-32"
      aria-labelledby="past-sponsors"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="past-sponsors"
          className="text-3xl font-black leading-none text-[var(--club-gold)] md:text-4xl"
          data-reveal="headline"
        >
          <span className="club-line">
            <span>Past Supporters</span>
          </span>
        </h2>

        <div
          className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-stagger
        >
          {sortSponsorsByName(PAST_SPONSORS).map((sponsor) => (
            <SponsorTile
              key={sponsor.id}
              sponsor={{
                ...sponsor,
                websiteUrl: SPONSOR_WEBSITE_URLS[sponsor.id],
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SponsorFaq() {
  const [openQuestion, setOpenQuestion] = useState<string | undefined>(
    FAQ_ITEMS[0].question,
  );

  return (
    <section className="container py-24 md:py-32" aria-labelledby="sponsor-faq">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-8 border-b-4 border-[var(--club-gold)] pb-6">
          <h2
            id="sponsor-faq"
            className="text-3xl font-black uppercase leading-none text-white md:text-4xl"
          >
            FAQ
          </h2>
          <p className="hidden text-sm font-black uppercase tracking-[0.3em] text-[#f74f83] md:block">
            Got Questions?
          </p>
        </div>

        <div className="divide-white/12 mt-11 divide-y">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openQuestion === item.question;

            return (
              <div key={item.question} className="py-7">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-6 text-left"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenQuestion(isOpen ? undefined : item.question)
                  }
                >
                  <span className="text-base font-black uppercase leading-6 text-white">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden="true"
                    className={cn(
                      "size-6 shrink-0 text-white/45 transition",
                      isOpen && "rotate-45 text-[var(--club-gold)]",
                    )}
                  />
                </button>
                {isOpen ? (
                  <p className="club-faq-answer mt-5 max-w-3xl text-sm font-semibold leading-7 text-[#d8c8df]">
                    {item.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function SponsorsClient() {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const sponsorUrl = new URL("/sponsor", PUBLIC_LINKS.blade).toString();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedSlideIndex(
        (index) => (index + 1) % FEATURED_SUPPORTER_SLIDES.length,
      );
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [selectedSlideIndex]);

  function showPreviousSlide() {
    setSelectedSlideIndex(
      (index) =>
        (index - 1 + FEATURED_SUPPORTER_SLIDES.length) %
        FEATURED_SUPPORTER_SLIDES.length,
    );
  }

  function showNextSlide() {
    setSelectedSlideIndex(
      (index) => (index + 1) % FEATURED_SUPPORTER_SLIDES.length,
    );
  }

  return (
    <main className="min-h-screen">
      <Hero sponsorUrl={sponsorUrl} />
      <div className="club-hero-transition-layer" aria-hidden="true" />
      <SponsorHighlight
        slides={FEATURED_SUPPORTER_SLIDES}
        selectedIndex={selectedSlideIndex}
        onPrevious={showPreviousSlide}
        onNext={showNextSlide}
      />
      <PastSponsorGrid />
      <SponsorFaq />
    </main>
  );
}
