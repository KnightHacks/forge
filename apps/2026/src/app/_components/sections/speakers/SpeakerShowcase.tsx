"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import type { SpeakerShowcaseSpeaker } from "./speakers";
import { useViewportActivity } from "../../useViewportActivity";
import styles from "./SpeakerShowcase.module.css";

const AUTO_SCROLL_DELAY_MS = 4200;
const SPEAKER_ENTER_MS = 300;
const SPEAKER_EXIT_MS = 240;
const MOBILE_VISIBLE_SPEAKER_COUNT = 1;
const LARGE_DESKTOP_VISIBLE_SPEAKER_COUNT = 2;
const LARGE_DESKTOP_VISIBLE_SPEAKERS_QUERY = "(min-width: 1800px)";

type SpeakerTransitionDirection = "next" | "previous";
type SpeakerTransitionState = "idle" | "exiting" | "entering";

interface VisibleSpeaker {
  index: number;
  speaker: SpeakerShowcaseSpeaker;
}

export interface SpeakerShowcaseProps {
  speakers: readonly SpeakerShowcaseSpeaker[];
  className?: string;
  title?: string;
  titleId?: string;
}

/** Returns a stable carousel key for a speaker record. */
function getSpeakerKey(speaker: SpeakerShowcaseSpeaker, index: number) {
  return `${speaker.name}-${speaker.companyRole}-${index}`;
}

/** Builds useful portrait alternative text from available speaker metadata. */
function getSpeakerImageAlt(speaker: SpeakerShowcaseSpeaker) {
  if (speaker.name.toLowerCase() === "coming soon") {
    return "";
  }

  return `${speaker.name} speaker portrait`;
}

/** Builds the accessible label for a speaker's LinkedIn profile link. */
function getLinkedInLabel(speaker: SpeakerShowcaseSpeaker) {
  return `Open ${speaker.name}'s LinkedIn profile`;
}

/** Wraps the carousel index to the previous speaker. */
function getPreviousSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex - 1 + speakerCount) % speakerCount;
}

/** Wraps the carousel index to the next speaker. */
function getNextSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex + 1) % speakerCount;
}

/** Returns the previous, active, and next speakers for the carousel stage. */
function getVisibleSpeakers(
  speakers: readonly SpeakerShowcaseSpeaker[],
  activeSpeakerIndex: number,
  visibleSpeakerCount: number,
) {
  const resolvedVisibleSpeakerCount = Math.min(
    visibleSpeakerCount,
    speakers.length,
  );
  const visibleSpeakers: VisibleSpeaker[] = [];

  for (let offset = 0; offset < resolvedVisibleSpeakerCount; offset += 1) {
    const index = (activeSpeakerIndex + offset) % speakers.length;
    const speaker = speakers[index];

    if (speaker) {
      visibleSpeakers.push({ index, speaker });
    }
  }

  return visibleSpeakers;
}

/** Renders a speaker portrait with an optional external profile link. */
function SpeakerPortrait({ speaker }: { speaker: SpeakerShowcaseSpeaker }) {
  const portraitStage = (
    <div className={styles.portraitStage}>
      <div className={styles.imageFrame}>
        <Image
          src={speaker.imageSrc}
          alt={getSpeakerImageAlt(speaker)}
          fill
          sizes="(max-width: 640px) 12rem, (max-width: 960px) 13rem, 16rem"
          className={styles.image}
          priority={false}
          draggable={false}
        />
      </div>
      <Image
        src="https://assets.knighthacks.org/khix/speaker-frame.webp"
        alt=""
        fill
        sizes="(max-width: 640px) 13rem, (max-width: 960px) 14rem, 17rem"
        className={styles.frameImage}
        priority={false}
        draggable={false}
      />
    </div>
  );

  if (!speaker.linkedinUrl) {
    return <div className={styles.portraitShell}>{portraitStage}</div>;
  }

  return (
    <a
      className={`${styles.portraitShell} ${styles.portraitLink}`}
      href={speaker.linkedinUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={getLinkedInLabel(speaker)}
      title="LinkedIn"
      draggable={false}
    >
      {portraitStage}
    </a>
  );
}

/** Renders the responsive speaker carousel and pauses auto-rotation offscreen. */
export function SpeakerShowcase({
  className,
  speakers,
  title = "Speakers",
  titleId = "khix-speakers-title",
}: SpeakerShowcaseProps) {
  const [showcaseRef, isShowcaseActive] = useViewportActivity<HTMLElement>();
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0);
  const [visibleSpeakerCount, setVisibleSpeakerCount] = useState(
    MOBILE_VISIBLE_SPEAKER_COUNT,
  );
  const [pendingSpeakerIndex, setPendingSpeakerIndex] = useState<number | null>(
    null,
  );
  const [transitionDirection, setTransitionDirection] =
    useState<SpeakerTransitionDirection>("next");
  const [transitionState, setTransitionState] =
    useState<SpeakerTransitionState>("idle");
  const normalizedActiveSpeakerIndex =
    speakers.length > 0 ? activeSpeakerIndex % speakers.length : 0;
  const renderedSpeakerCount = Math.min(visibleSpeakerCount, speakers.length);
  const visibleSpeakers = getVisibleSpeakers(
    speakers,
    normalizedActiveSpeakerIndex,
    visibleSpeakerCount,
  );
  const hasScrollableSpeakers = speakers.length > renderedSpeakerCount;
  const isTransitioning = transitionState !== "idle";
  const speakerShowcaseClassName = className
    ? `${styles.speakerShowcase} ${className}`
    : styles.speakerShowcase;

  /** Starts a direction-aware transition to a requested speaker. */
  const startSpeakerTransition = useCallback(
    (nextSpeakerIndex: number, direction: SpeakerTransitionDirection) => {
      if (!hasScrollableSpeakers || isTransitioning) return;

      const normalizedNextSpeakerIndex = nextSpeakerIndex % speakers.length;

      if (normalizedNextSpeakerIndex === normalizedActiveSpeakerIndex) return;

      setPendingSpeakerIndex(normalizedNextSpeakerIndex);
      setTransitionDirection(direction);
      setTransitionState("exiting");
    },
    [
      hasScrollableSpeakers,
      isTransitioning,
      normalizedActiveSpeakerIndex,
      speakers.length,
    ],
  );

  /** Moves the carousel to the previous speaker. */
  const showPreviousSpeaker = useCallback(() => {
    if (!hasScrollableSpeakers) return;

    startSpeakerTransition(
      getPreviousSpeakerIndex(normalizedActiveSpeakerIndex, speakers.length),
      "previous",
    );
  }, [
    hasScrollableSpeakers,
    normalizedActiveSpeakerIndex,
    speakers.length,
    startSpeakerTransition,
  ]);

  /** Moves the carousel to the next speaker. */
  const showNextSpeaker = useCallback(() => {
    if (!hasScrollableSpeakers) return;

    startSpeakerTransition(
      getNextSpeakerIndex(normalizedActiveSpeakerIndex, speakers.length),
      "next",
    );
  }, [
    hasScrollableSpeakers,
    normalizedActiveSpeakerIndex,
    speakers.length,
    startSpeakerTransition,
  ]);

  useEffect(() => {
    const visibleSpeakersQuery = window.matchMedia(
      LARGE_DESKTOP_VISIBLE_SPEAKERS_QUERY,
    );
    /** Chooses the number of staged portraits for the current breakpoint. */
    const updateVisibleSpeakerCount = () => {
      setVisibleSpeakerCount(
        visibleSpeakersQuery.matches
          ? LARGE_DESKTOP_VISIBLE_SPEAKER_COUNT
          : MOBILE_VISIBLE_SPEAKER_COUNT,
      );
    };

    updateVisibleSpeakerCount();
    visibleSpeakersQuery.addEventListener("change", updateVisibleSpeakerCount);

    return () => {
      visibleSpeakersQuery.removeEventListener(
        "change",
        updateVisibleSpeakerCount,
      );
    };
  }, []);

  useEffect(() => {
    if (!hasScrollableSpeakers || !isShowcaseActive || isTransitioning) return;

    const timeoutId = window.setTimeout(showNextSpeaker, AUTO_SCROLL_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoScrollResetKey,
    hasScrollableSpeakers,
    isShowcaseActive,
    isTransitioning,
    normalizedActiveSpeakerIndex,
    showNextSpeaker,
  ]);

  useEffect(() => {
    if (transitionState === "exiting" && pendingSpeakerIndex !== null) {
      const timeoutId = window.setTimeout(() => {
        setActiveSpeakerIndex(pendingSpeakerIndex);
        setPendingSpeakerIndex(null);
        setTransitionState("entering");
      }, SPEAKER_EXIT_MS);

      return () => window.clearTimeout(timeoutId);
    }

    if (transitionState === "entering") {
      const timeoutId = window.setTimeout(() => {
        setTransitionState("idle");
      }, SPEAKER_ENTER_MS);

      return () => window.clearTimeout(timeoutId);
    }
  }, [pendingSpeakerIndex, transitionState]);

  if (visibleSpeakers.length === 0) {
    return null;
  }

  /** Restarts the idle interval after a manual carousel interaction. */
  const resetAutoScrollTimer = () => {
    setAutoScrollResetKey((currentKey) => currentKey + 1);
  };

  /** Handles previous-speaker navigation and resets auto-rotation. */
  const handlePreviousSpeaker = () => {
    resetAutoScrollTimer();
    showPreviousSpeaker();
  };

  /** Handles next-speaker navigation and resets auto-rotation. */
  const handleNextSpeaker = () => {
    resetAutoScrollTimer();
    showNextSpeaker();
  };

  return (
    <section
      ref={showcaseRef}
      className={speakerShowcaseClassName}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>

      <div
        className={styles.stage}
        data-visible-speaker-count={visibleSpeakers.length}
      >
        <button
          className={styles.arrowButton}
          type="button"
          aria-label="Show previous speaker"
          title="Previous speaker"
          disabled={!hasScrollableSpeakers || isTransitioning}
          onClick={handlePreviousSpeaker}
        >
          <ArrowBigLeft aria-hidden="true" className={styles.arrowIcon} />
        </button>

        <div
          key={`${normalizedActiveSpeakerIndex}-${visibleSpeakers.length}`}
          className={styles.speakerList}
          data-active-speaker-index={normalizedActiveSpeakerIndex}
          data-speaker-count={speakers.length}
          data-transition-direction={transitionDirection}
          data-transition-state={transitionState}
          data-visible-speaker-count={visibleSpeakers.length}
          aria-live="polite"
          role="list"
        >
          {visibleSpeakers.map(({ index, speaker }) => (
            <article
              key={getSpeakerKey(speaker, index)}
              className={styles.speaker}
              role="listitem"
            >
              <SpeakerPortrait speaker={speaker} />
              <div className={styles.speakerMeta}>
                <div className={styles.nameRow}>
                  <p className={styles.name} title={speaker.name}>
                    {speaker.name}
                  </p>
                </div>
                {speaker.companyRole && (
                  <p className={styles.role}>{speaker.companyRole}</p>
                )}
              </div>
            </article>
          ))}
        </div>

        <button
          className={styles.arrowButton}
          type="button"
          aria-label="Show next speaker"
          title="Next speaker"
          disabled={!hasScrollableSpeakers || isTransitioning}
          onClick={handleNextSpeaker}
        >
          <ArrowBigRight aria-hidden="true" className={styles.arrowIcon} />
        </button>
      </div>
    </section>
  );
}
