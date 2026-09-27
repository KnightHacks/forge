"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import type { SpeakerShowcaseSpeaker } from "./speakers";
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

function getSpeakerKey(speaker: SpeakerShowcaseSpeaker, index: number) {
  return `${speaker.name}-${speaker.companyRole}-${index}`;
}

function getSpeakerImageAlt(speaker: SpeakerShowcaseSpeaker) {
  if (speaker.name.toLowerCase() === "coming soon") {
    return "";
  }

  return `${speaker.name} speaker portrait`;
}

function getLinkedInLabel(speaker: SpeakerShowcaseSpeaker) {
  return `Open ${speaker.name}'s LinkedIn profile`;
}

function getPreviousSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex - 1 + speakerCount) % speakerCount;
}

function getNextSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex + 1) % speakerCount;
}

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
          unoptimized
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
        unoptimized
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

export function SpeakerShowcase({
  className,
  speakers,
  title = "Speakers",
  titleId = "khix-speakers-title",
}: SpeakerShowcaseProps) {
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
    if (!hasScrollableSpeakers || isTransitioning) return;

    const timeoutId = window.setTimeout(showNextSpeaker, AUTO_SCROLL_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoScrollResetKey,
    hasScrollableSpeakers,
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

  const resetAutoScrollTimer = () => {
    setAutoScrollResetKey((currentKey) => currentKey + 1);
  };

  const handlePreviousSpeaker = () => {
    resetAutoScrollTimer();
    showPreviousSpeaker();
  };

  const handleNextSpeaker = () => {
    resetAutoScrollTimer();
    showNextSpeaker();
  };

  return (
    <section className={speakerShowcaseClassName} aria-labelledby={titleId}>
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
