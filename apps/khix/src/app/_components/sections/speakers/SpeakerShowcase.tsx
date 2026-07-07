"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { SpeakerShowcaseSpeaker } from "./speakers";
import styles from "./SpeakerShowcase.module.css";

const AUTO_SCROLL_DELAY_MS = 4200;
const SPEAKER_ENTER_MS = 300;
const SPEAKER_EXIT_MS = 240;

type SpeakerTransitionDirection = "next" | "previous";
type SpeakerTransitionState = "idle" | "exiting" | "entering";

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

function getPreviousSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex - 1 + speakerCount) % speakerCount;
}

function getNextSpeakerIndex(currentIndex: number, speakerCount: number) {
  return (currentIndex + 1) % speakerCount;
}

export function SpeakerShowcase({
  className,
  speakers,
  title = "Speakers",
  titleId = "khix-speakers-title",
}: SpeakerShowcaseProps) {
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0);
  const [pendingSpeakerIndex, setPendingSpeakerIndex] = useState<number | null>(
    null,
  );
  const [transitionDirection, setTransitionDirection] =
    useState<SpeakerTransitionDirection>("next");
  const [transitionState, setTransitionState] =
    useState<SpeakerTransitionState>("idle");
  const activeSpeaker = speakers[activeSpeakerIndex] ?? speakers[0];
  const hasMultipleSpeakers = speakers.length > 1;
  const isTransitioning = transitionState !== "idle";
  const speakerShowcaseClassName = className
    ? `${styles.speakerShowcase} ${className}`
    : styles.speakerShowcase;

  const startSpeakerTransition = useCallback(
    (nextSpeakerIndex: number, direction: SpeakerTransitionDirection) => {
      if (!hasMultipleSpeakers || isTransitioning) return;

      const normalizedNextSpeakerIndex = nextSpeakerIndex % speakers.length;

      if (normalizedNextSpeakerIndex === activeSpeakerIndex) return;

      setPendingSpeakerIndex(normalizedNextSpeakerIndex);
      setTransitionDirection(direction);
      setTransitionState("exiting");
    },
    [activeSpeakerIndex, hasMultipleSpeakers, isTransitioning, speakers.length],
  );

  const showPreviousSpeaker = useCallback(() => {
    if (!hasMultipleSpeakers) return;

    startSpeakerTransition(
      getPreviousSpeakerIndex(activeSpeakerIndex, speakers.length),
      "previous",
    );
  }, [
    activeSpeakerIndex,
    hasMultipleSpeakers,
    speakers.length,
    startSpeakerTransition,
  ]);

  const showNextSpeaker = useCallback(() => {
    if (!hasMultipleSpeakers) return;

    startSpeakerTransition(
      getNextSpeakerIndex(activeSpeakerIndex, speakers.length),
      "next",
    );
  }, [
    activeSpeakerIndex,
    hasMultipleSpeakers,
    speakers.length,
    startSpeakerTransition,
  ]);

  useEffect(() => {
    if (!hasMultipleSpeakers || isTransitioning) return;

    const timeoutId = window.setTimeout(showNextSpeaker, AUTO_SCROLL_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeSpeakerIndex,
    autoScrollResetKey,
    hasMultipleSpeakers,
    isTransitioning,
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

  if (!activeSpeaker) {
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

      <div className={styles.stage}>
        <button
          className={styles.arrowButton}
          type="button"
          aria-label="Show previous speaker"
          title="Previous speaker"
          disabled={!hasMultipleSpeakers || isTransitioning}
          onClick={handlePreviousSpeaker}
        >
          <ChevronLeft aria-hidden="true" className={styles.arrowIcon} />
        </button>

        <div
          key={getSpeakerKey(activeSpeaker, activeSpeakerIndex)}
          className={styles.speaker}
          data-active-speaker-index={activeSpeakerIndex}
          data-speaker-count={speakers.length}
          data-transition-direction={transitionDirection}
          data-transition-state={transitionState}
          aria-live="polite"
        >
          <div className={styles.portraitStage}>
            <div className={styles.portraitGlow} aria-hidden="true" />
            <svg
              className={styles.outline}
              viewBox="0 0 240 300"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="13"
                y="12"
                width="214"
                height="276"
                rx="22"
                stroke="currentColor"
                strokeWidth="3"
              />
              <rect
                x="28"
                y="29"
                width="184"
                height="242"
                rx="16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeDasharray="10 12"
              />
            </svg>
            <div className={styles.imageFrame}>
              <Image
                src={activeSpeaker.imageSrc}
                alt={getSpeakerImageAlt(activeSpeaker)}
                fill
                sizes="(max-width: 640px) 12rem, 16rem"
                className={styles.image}
                priority={false}
                unoptimized
              />
            </div>
          </div>

          <p className={styles.name}>{activeSpeaker.name}</p>
          <p className={styles.role}>{activeSpeaker.companyRole}</p>
        </div>

        <button
          className={styles.arrowButton}
          type="button"
          aria-label="Show next speaker"
          title="Next speaker"
          disabled={!hasMultipleSpeakers || isTransitioning}
          onClick={handleNextSpeaker}
        >
          <ChevronRight aria-hidden="true" className={styles.arrowIcon} />
        </button>
      </div>
    </section>
  );
}
