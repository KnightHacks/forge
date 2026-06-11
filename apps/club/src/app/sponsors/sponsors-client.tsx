"use client";

import type { ImageLoaderProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import type {
  SponsorHackathon,
  SponsorRecord,
  SponsorTier,
} from "./sponsors-config";
import {
  FAQ_ITEMS,
  FEATURED_SUPPORTER_SLIDES,
  PARTNER_SECTION,
  SPONSOR_SECTIONS,
} from "./sponsors-config";

type SponsorStatus = "loading" | "ready" | "error";

interface SponsorsPayload {
  hackathon: SponsorHackathon | null;
  sponsors: SponsorRecord[];
}

const emptyPayload: SponsorsPayload = {
  hackathon: null,
  sponsors: [],
};

const sponsorLogoLoader = ({ src }: ImageLoaderProps) => src;

function isSponsorTier(value: unknown): value is SponsorTier {
  return (
    value === "gold" ||
    value === "silver" ||
    value === "bronze" ||
    value === "other"
  );
}

function normalizeSponsorLogoUrl(logoUrl: string) {
  const trimmedLogoUrl = logoUrl.trim();

  if (
    trimmedLogoUrl.startsWith("/") ||
    trimmedLogoUrl.startsWith("https://") ||
    trimmedLogoUrl.startsWith("http://")
  ) {
    return trimmedLogoUrl;
  }

  return `/logos/${trimmedLogoUrl}`;
}

function normalizeSponsorsPayload(value: unknown): SponsorsPayload {
  if (!value || typeof value !== "object") {
    return emptyPayload;
  }

  const payload = value as {
    hackathon?: unknown;
    sponsors?: unknown;
  };

  const hackathon =
    payload.hackathon &&
    typeof payload.hackathon === "object" &&
    typeof (payload.hackathon as SponsorHackathon).id === "string" &&
    typeof (payload.hackathon as SponsorHackathon).name === "string" &&
    typeof (payload.hackathon as SponsorHackathon).displayName === "string" &&
    typeof (payload.hackathon as SponsorHackathon).startDate === "string"
      ? (payload.hackathon as SponsorHackathon)
      : null;

  const sponsors = Array.isArray(payload.sponsors)
    ? payload.sponsors.filter(
        (sponsor): sponsor is SponsorRecord =>
          !!sponsor &&
          typeof sponsor === "object" &&
          typeof (sponsor as SponsorRecord).id === "string" &&
          typeof (sponsor as SponsorRecord).name === "string" &&
          typeof (sponsor as SponsorRecord).logoUrl === "string" &&
          typeof (sponsor as SponsorRecord).websiteUrl === "string" &&
          isSponsorTier((sponsor as SponsorRecord).tier),
      )
    : [];

  return {
    hackathon,
    sponsors,
  };
}

function SponsorLogo({
  sponsor,
  priority = false,
}: {
  sponsor: SponsorRecord;
  priority?: boolean;
}) {
  return (
    <Image
      src={normalizeSponsorLogoUrl(sponsor.logoUrl)}
      alt={`${sponsor.name} logo`}
      width={360}
      height={140}
      loader={sponsorLogoLoader}
      unoptimized
      priority={priority}
      className="max-h-full w-full object-contain p-5 transition duration-200 group-hover:scale-[1.03]"
      sizes="(min-width: 1024px) 260px, (min-width: 640px) 42vw, 78vw"
    />
  );
}

function SponsorTile({
  sponsor,
  className,
}: {
  sponsor: SponsorRecord;
  className?: string;
}) {
  return (
    <a
      href={sponsor.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "club-sponsor-tile bg-[#2b0d35]/72 group flex min-h-28 items-center justify-center border-[2px] border-white/15 shadow-[5px_5px_0_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-[var(--club-gold)] hover:bg-[#351346]",
        className,
      )}
      aria-label={`Visit ${sponsor.name}`}
    >
      <SponsorLogo sponsor={sponsor} />
    </a>
  );
}

function EmptySponsorSection({
  label,
  status,
}: {
  label: string;
  status: SponsorStatus;
}) {
  const message =
    status === "loading"
      ? "Loading supporters."
      : status === "error"
        ? "Supporters are unavailable right now."
        : "No supporters are published in this group yet.";

  return (
    <div className="border-white/12 bg-[#24102e]/72 border-[2px] px-6 py-9 text-center shadow-[5px_5px_0_rgba(0,0,0,0.22)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--club-gold)]">
        {label}
      </p>
      <p className="text-white/72 mt-3 text-sm font-bold leading-6">
        {message}
      </p>
    </div>
  );
}

function Hero({ sponsorUrl }: { sponsorUrl: string }) {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-24 pt-28 text-center md:px-10 md:pb-28 md:pt-36 lg:px-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_48%,rgba(247,79,131,0.24)_0%,rgba(91,13,73,0.14)_34%,transparent_72%)]"
      />
      <div className="relative z-10 mx-auto max-w-5xl" data-stagger>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
          Sponsors & Partners
        </p>
        <h1
          className="mt-5 text-5xl font-black uppercase leading-none text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.38)] md:text-7xl lg:text-8xl"
          data-reveal="headline-ladder"
        >
          <span className="club-line">
            <span>Our Supporters</span>
          </span>
        </h1>

        <div
          className="relative mx-auto mt-12 max-w-3xl border-[3px] border-white/85 px-7 py-8 text-left shadow-[8px_9px_0_rgba(0,0,0,0.28)] md:px-10"
          data-reveal="pop"
        >
          <span className="absolute left-2 top-2 h-8 w-8 border-l-[4px] border-t-[4px] border-white" />
          <span className="absolute bottom-2 right-2 h-8 w-8 border-b-[4px] border-r-[4px] border-white" />
          <p className="text-sm font-black uppercase leading-7 text-white md:text-base">
            Our sponsors make it possible for us to unite developers, designers,
            and builders across Florida and beyond. Hacker communities grow
            stronger when students can learn, ship, and meet teams building the
            future.
          </p>
        </div>

        <Button asChild className="club-button club-button-pink mt-10 px-8">
          <a href={sponsorUrl}>
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
    <section className="relative px-6 py-24 md:px-10">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[0.95fr_1fr]">
        <div>
          <div
            className={cn(
              "bg-[#1d1325]/88 relative aspect-[1.62] overflow-hidden border-[3px] transition duration-300",
              selectedSlide.frameClassName,
            )}
            data-reveal="photo"
            data-scroll-drift="14"
          >
            <div
              key={selectedSlide.id}
              className="animate-in fade-in duration-500"
            >
              <Image
                src={selectedSlide.imageSrc}
                alt={selectedSlide.alt}
                fill
                priority={selectedIndex === 0}
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
              "inline-block -rotate-1 px-3 py-1 text-2xl font-black uppercase leading-none md:text-4xl",
              selectedSlide.accentClassName,
            )}
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

function SponsorGrid({
  sponsors,
  status,
}: {
  sponsors: SponsorRecord[];
  status: SponsorStatus;
}) {
  return (
    <section
      className="container py-24 md:py-28"
      aria-labelledby="sponsor-grid"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="sponsor-grid"
          className="text-3xl font-black leading-none text-[var(--club-gold)] md:text-4xl"
          data-reveal="headline"
        >
          <span className="club-line">
            <span>Our Sponsors</span>
          </span>
        </h2>

        <div className="mt-10 space-y-11">
          {SPONSOR_SECTIONS.map((section) => {
            const sectionSponsors = sponsors.filter(
              (sponsor) => sponsor.tier === section.tier,
            );

            return (
              <div key={section.tier}>
                <div className="mb-4 flex items-center gap-4">
                  <p className="text-white/52 text-xs font-black uppercase tracking-[0.2em]">
                    {section.heading}
                  </p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {sectionSponsors.length > 0 ? (
                  <div
                    className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                    data-stagger
                  >
                    {sectionSponsors.map((sponsor) => (
                      <SponsorTile
                        key={sponsor.id}
                        sponsor={sponsor}
                        className={section.tileClassName}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptySponsorSection label={section.label} status={status} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PartnerGrid({
  partners,
  status,
}: {
  partners: SponsorRecord[];
  status: SponsorStatus;
}) {
  return (
    <section className="container pb-24 md:pb-32" aria-labelledby="partners">
      <div className="mx-auto max-w-6xl">
        <h2
          id="partners"
          className="text-3xl font-black leading-none text-[var(--club-gold)] md:text-4xl"
          data-reveal="headline"
        >
          <span className="club-line">
            <span>{PARTNER_SECTION.heading}</span>
          </span>
        </h2>

        <div className="mt-9">
          {partners.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3" data-stagger>
              {partners.map((partner) => (
                <SponsorTile key={partner.id} sponsor={partner} />
              ))}
            </div>
          ) : (
            <EmptySponsorSection
              label={PARTNER_SECTION.label}
              status={status}
            />
          )}
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

export default function SponsorsClient({
  bladeUrl,
  sponsorsEndpoint,
}: {
  bladeUrl: string;
  sponsorsEndpoint: string;
}) {
  const [payload, setPayload] = useState<SponsorsPayload>(emptyPayload);
  const [status, setStatus] = useState<SponsorStatus>("loading");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const lastManualSlideChangeRef = useRef(0);
  const sponsorUrl = new URL("/sponsor", bladeUrl).toString();
  const sponsorRecords = payload.sponsors.filter(
    (sponsor) => sponsor.tier !== PARTNER_SECTION.tier,
  );
  const partnerRecords = payload.sponsors.filter(
    (sponsor) => sponsor.tier === PARTNER_SECTION.tier,
  );

  useEffect(() => {
    const abortController = new AbortController();

    async function loadSponsors() {
      setStatus("loading");

      try {
        const response = await fetch(sponsorsEndpoint, {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Blade returned ${response.status}`);
        }

        const data = normalizeSponsorsPayload(await response.json());

        setPayload(data);
        setStatus("ready");
      } catch {
        if (abortController.signal.aborted) return;

        setPayload(emptyPayload);
        setStatus("error");
      }
    }

    void loadSponsors();

    return () => abortController.abort();
  }, [sponsorsEndpoint]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (Date.now() - lastManualSlideChangeRef.current < 1000) {
        return;
      }

      setSelectedSlideIndex(
        (index) => (index + 1) % FEATURED_SUPPORTER_SLIDES.length,
      );
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [selectedSlideIndex]);

  function showPreviousSlide() {
    lastManualSlideChangeRef.current = Date.now();
    setSelectedSlideIndex(
      (index) =>
        (index - 1 + FEATURED_SUPPORTER_SLIDES.length) %
        FEATURED_SUPPORTER_SLIDES.length,
    );
  }

  function showNextSlide() {
    lastManualSlideChangeRef.current = Date.now();
    setSelectedSlideIndex(
      (index) => (index + 1) % FEATURED_SUPPORTER_SLIDES.length,
    );
  }

  return (
    <main className="min-h-screen">
      <Hero sponsorUrl={sponsorUrl} />
      <SponsorHighlight
        slides={FEATURED_SUPPORTER_SLIDES}
        selectedIndex={selectedSlideIndex}
        onPrevious={showPreviousSlide}
        onNext={showNextSlide}
      />
      <SponsorGrid sponsors={sponsorRecords} status={status} />
      <PartnerGrid partners={partnerRecords} status={status} />
      <SponsorFaq />
    </main>
  );
}
