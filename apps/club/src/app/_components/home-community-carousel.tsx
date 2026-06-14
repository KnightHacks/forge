"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@forge/ui";

import { CLUB_ASSETS } from "../_lib/assets";

interface CommunitySlide {
  id: string;
  eyebrow: string;
  title?: string;
  body: string;
  image: string;
  imageAlt: string;
  caption: string;
  imageSide: "left" | "right";
  accentClassName: string;
  rotationClassName: string;
}

const COMMUNITY_SLIDES: [CommunitySlide, ...CommunitySlide[]] = [
  {
    id: "builders",
    eyebrow: "Community",
    title: "of builders",
    body: "We're more than just a club. Knight Hacks is a community of builders, innovators, and creators who turn ideas into reality. Through hands-on hackathons, skill-building workshops, and a supportive network, we empower students to grow as developers and leaders in tech.",
    image: CLUB_ASSETS.clubCommunityEvent,
    imageAlt: "Knight Hacks builders gathered at an event",
    caption: "Find your people. Build the future.",
    imageSide: "left",
    accentClassName: "bg-[#de2868]",
    rotationClassName: "-rotate-6",
  },
  {
    id: "workshops",
    eyebrow: "Workshop series",
    body: "Whether you're writing your first line of code or building full-stack applications, our workshops provide the hands-on experience you need. Learn from industry professionals and peers in a collaborative environment.",
    image: CLUB_ASSETS.memberNetworkingSession,
    imageAlt: "Knight Hacks members networking after a club event",
    caption: "Learn it by building.",
    imageSide: "right",
    accentClassName: "bg-[var(--club-gold)] text-black",
    rotationClassName: "rotate-6",
  },
  {
    id: "career",
    eyebrow: "Career",
    title: "opportunities",
    body: "Connect with top tech companies, network with recruiters, and land internships or full-time roles. Our sponsors are always looking for the bright minds that emerge from the Knight Hacks community.",
    image: CLUB_ASSETS.projectLaunchPresentations,
    imageAlt: "Knight Hacks members presenting project work",
    caption: "Securing the bag.",
    imageSide: "left",
    accentClassName: "bg-[#8e4ed6]",
    rotationClassName: "rotate-3",
  },
];

function formatSlideNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function Polaroid({ slide }: { slide: CommunitySlide }) {
  return (
    <div className="club-polaroid-wrap" data-community-photo>
      <div
        className={cn(
          "club-polaroid relative w-full bg-white p-3 pb-11 shadow-[10px_12px_0_rgba(0,0,0,0.38)] transition duration-300 sm:p-4 sm:pb-12 md:shadow-[12px_14px_0_rgba(0,0,0,0.38)]",
          slide.rotationClassName,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#24252a]">
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 27rem, (min-width: 768px) 42vw, 84vw"
            className="object-cover object-center grayscale transition duration-300"
          />
        </div>
        <p className="absolute bottom-5 left-0 right-0 px-6 text-center text-[10px] font-black uppercase text-black">
          {slide.caption}
        </p>
      </div>
    </div>
  );
}

function SlideCopy({ slide }: { slide: CommunitySlide }) {
  const isSingleLineHeadline = !slide.title;

  return (
    <div
      className="w-full min-w-0 max-w-[32rem]"
      data-community-copy
      data-stagger
    >
      <h2
        className={
          isSingleLineHeadline
            ? "text-[clamp(1.75rem,6.7vw,2.85rem)] font-black uppercase leading-none tracking-normal"
            : "text-4xl font-black uppercase leading-none tracking-normal md:text-5xl lg:text-6xl"
        }
      >
        <span
          className={`inline-block px-2 text-white ${isSingleLineHeadline ? "whitespace-nowrap" : ""} ${slide.accentClassName}`}
        >
          {slide.eyebrow}
        </span>
        {slide.title ? (
          <>
            <br />
            <span className="text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.45)]">
              {slide.title}
            </span>
          </>
        ) : null}
      </h2>
      <p className="mt-8 border-l-2 border-[var(--club-gold)] bg-black/20 py-1 pl-5 text-sm leading-7 text-[var(--club-muted)] md:text-base md:leading-8">
        {slide.body}
      </p>
    </div>
  );
}

export function HomeCommunityCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = COMMUNITY_SLIDES[activeIndex] ?? COMMUNITY_SLIDES[0];
  const slideCount = COMMUNITY_SLIDES.length;
  const slideNumber = useMemo(
    () => formatSlideNumber(activeIndex),
    [activeIndex],
  );

  function goToPreviousSlide() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? slideCount - 1 : currentIndex - 1,
    );
  }

  function goToNextSlide() {
    setActiveIndex((currentIndex) =>
      currentIndex === slideCount - 1 ? 0 : currentIndex + 1,
    );
  }

  return (
    <section
      className="club-community-carousel relative px-5 pb-24 sm:px-6 md:px-10 md:pb-28 lg:px-24"
      data-community-carousel
    >
      <div
        key={activeSlide.id}
        data-motion-scope
        data-community-carousel-grid
        className="mx-auto grid min-h-[34rem] w-full max-w-[1120px] grid-cols-1 items-center gap-12 py-10 md:min-h-[38rem] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-12 lg:gap-16"
      >
        <div
          className={cn(
            "min-w-0 justify-self-center md:justify-self-stretch",
            activeSlide.imageSide === "right" ? "md:order-2" : "md:order-1",
          )}
        >
          <Polaroid slide={activeSlide} />
        </div>
        <div
          className={cn(
            "flex min-w-0 justify-center md:justify-start",
            activeSlide.imageSide === "right" ? "md:order-1" : "md:order-2",
          )}
        >
          <SlideCopy slide={activeSlide} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5 md:mt-8">
        <button
          type="button"
          aria-label="Previous community slide"
          className="club-carousel-control flex size-10 items-center justify-center border-[3px] border-black bg-white text-black shadow-[4px_4px_0_var(--club-gold)] transition hover:-translate-y-0.5"
          onClick={goToPreviousSlide}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <span className="text-xs font-black text-[var(--club-gold)]">
          {slideNumber}
        </span>
        <span className="text-xs font-black text-white/40">/</span>
        <span className="text-xs font-black text-white/55">
          {formatSlideNumber(slideCount - 1)}
        </span>
        <button
          type="button"
          aria-label="Next community slide"
          className="club-carousel-control flex size-10 items-center justify-center border-[3px] border-black bg-white text-black shadow-[4px_4px_0_var(--club-gold)] transition hover:-translate-y-0.5"
          onClick={goToNextSlide}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
  );
}
