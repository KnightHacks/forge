"use client";

import type { Variants } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  FaDiscord,
  FaGithub,
  FaInstagram,
  FaLink,
  FaLinkedin,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

import {
  APPLICATION_URL,
  DISCORD_URL,
  GITHUB_URL,
  INSTAGRAM_URL,
  LINKEDIN_URL,
  LINKTREE_URL,
  SEO_DESCRIPTION,
  SPONSOR_URL,
} from "./seo";

const mlhCodeOfConductUrl = "https://mlh.io/code-of-conduct";
const mlhTrustBadgeUrl =
  "https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2027-season&utm_content=white";
const mlhTrustBadgeImage =
  "https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-white.svg";

const reveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "tween", duration: 0.58, ease: "easeOut" },
  },
};

const fadeReveal: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { type: "tween", duration: 0.5, ease: "easeOut" },
  },
};

const musicVolume = 0.16;
const birdsVolume = 0.055;

const socialLinks = [
  {
    label: "Discord",
    href: DISCORD_URL,
    Icon: FaDiscord,
  },
  {
    label: "Instagram",
    href: INSTAGRAM_URL,
    Icon: FaInstagram,
  },
  {
    label: "LinkedIn",
    href: LINKEDIN_URL,
    Icon: FaLinkedin,
  },
  {
    label: "GitHub",
    href: GITHUB_URL,
    Icon: FaGithub,
  },
  {
    label: "Linktree",
    href: LINKTREE_URL,
    Icon: FaLink,
  },
];

interface ExperienceState {
  hasEntered: boolean;
  music: "idle" | "playing" | "paused";
}

type ExperienceEvent =
  | { type: "ENTER" }
  | { type: "MUSIC_STARTED" }
  | { type: "MUSIC_PAUSED" };

const initialExperienceState: ExperienceState = {
  hasEntered: false,
  music: "idle",
};

function prepareAudioTrack(
  audio: HTMLAudioElement | null,
  volume: number,
): HTMLAudioElement | null {
  if (!audio) {
    return null;
  }

  audio.volume = volume;
  audio.loop = true;
  return audio;
}

async function playAudioTracks(
  primaryTrack: HTMLAudioElement | null,
  secondaryTracks: HTMLAudioElement[] = [],
) {
  if (!primaryTrack) {
    return false;
  }

  const tracks = [primaryTrack, ...secondaryTracks];
  const results = await Promise.allSettled(tracks.map((track) => track.play()));
  const didStartPrimaryTrack =
    results[0]?.status === "fulfilled" && !primaryTrack.paused;

  if (!didStartPrimaryTrack) {
    tracks.forEach((track) => track.pause());
  }

  return didStartPrimaryTrack;
}

function experienceReducer(
  state: ExperienceState,
  event: ExperienceEvent,
): ExperienceState {
  switch (event.type) {
    case "ENTER":
      return { ...state, hasEntered: true };
    case "MUSIC_STARTED":
      return { hasEntered: true, music: "playing" };
    case "MUSIC_PAUSED":
      return { ...state, music: state.hasEntered ? "paused" : "idle" };
    default:
      return state;
  }
}

export default function Page() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const birdsAudioRef = useRef<HTMLAudioElement>(null);
  const hasStartedExperienceRef = useRef(false);
  const [experienceState, sendExperienceEvent] = useReducer(
    experienceReducer,
    initialExperienceState,
  );
  const hasEntered = experienceState.hasEntered;
  const isMusicPlaying = experienceState.music === "playing";

  const startExperience = useCallback(async () => {
    if (hasEntered || hasStartedExperienceRef.current) {
      return;
    }

    hasStartedExperienceRef.current = true;
    sendExperienceEvent({ type: "ENTER" });

    const musicTrack = prepareAudioTrack(audioRef.current, musicVolume);
    const secondaryTracks = [
      prepareAudioTrack(birdsAudioRef.current, birdsVolume),
    ].filter((track): track is HTMLAudioElement => Boolean(track));

    const didStartAudio = await playAudioTracks(musicTrack, secondaryTracks);
    if (didStartAudio) {
      sendExperienceEvent({ type: "MUSIC_STARTED" });
    } else {
      sendExperienceEvent({ type: "MUSIC_PAUSED" });
    }
  }, [hasEntered]);

  useEffect(() => {
    if (hasEntered) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      void startExperience();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasEntered, startExperience]);

  const toggleMusic = async () => {
    const musicTrack = prepareAudioTrack(audioRef.current, musicVolume);
    const secondaryTracks = [
      prepareAudioTrack(birdsAudioRef.current, birdsVolume),
    ].filter((track): track is HTMLAudioElement => Boolean(track));
    const tracks = musicTrack
      ? [musicTrack, ...secondaryTracks]
      : [...secondaryTracks];

    if (tracks.length === 0) {
      return;
    }

    if (isMusicPlaying) {
      tracks.forEach((track) => track.pause());
      sendExperienceEvent({ type: "MUSIC_PAUSED" });
      return;
    }

    const didStartAudio = await playAudioTracks(musicTrack, secondaryTracks);
    if (didStartAudio) {
      sendExperienceEvent({ type: "MUSIC_STARTED" });
    } else {
      sendExperienceEvent({ type: "MUSIC_PAUSED" });
    }
  };

  return (
    <main
      className={`khix-site-background ${
        hasEntered ? "khix-experience-entered" : "khix-experience-awaiting"
      }`}
    >
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />
      <audio ref={birdsAudioRef} src="/birds.mp3" loop preload="auto" />

      <div className="khix-experience-stage">
        <div className="khix-background-layer" aria-hidden="true" />
        <div className="khix-edge-gloom" aria-hidden="true" />
        <MlhTrustBadge hasEntered={hasEntered} />

        <section className="khix-hero" aria-label="Knight Hacks IX">
          <div className="khix-gem-aura" aria-hidden="true" />
          <div className="khix-gem-magic" aria-hidden="true">
            <span className="khix-gem-magic-wisp khix-gem-magic-wisp-left" />
            <span className="khix-gem-magic-wisp khix-gem-magic-wisp-mid" />
            <span className="khix-gem-magic-wisp khix-gem-magic-wisp-right" />
            <span className="khix-gem-magic-thread khix-gem-magic-thread-left" />
            <span className="khix-gem-magic-thread khix-gem-magic-thread-right" />
          </div>
          <div className="khix-gem-shard-shimmer" aria-hidden="true" />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <motion.img
              src="/mushroom.png"
              alt=""
              className="khix-stage-accent-mushroom"
              width={372}
              height={295}
              draggable={false}
              style={{
                position: "absolute",
                top: "44.5%",
                left: "var(--khix-mushroom-left, calc(50% - clamp(6rem, 22vw, 34rem)))",
                translate: "-50% -50%",
                width:
                  "var(--khix-mushroom-width, clamp(7.8rem, 13vw, 12.8rem))",
                height: "auto",
                opacity: 0.88,
                transformOrigin: "50% 95%",
                userSelect: "none",
              }}
              animate={
                hasEntered
                  ? {
                      y: [0, -2, 0, 1, 0],
                      scale: [1, 1.035, 1.01, 0.995, 1],
                      rotate: [-0.7, 0.8, -0.4, 0.4, -0.7],
                    }
                  : false
              }
              transition={{
                duration: 7.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.img
              src="/flower.png"
              alt=""
              width={237}
              height={247}
              draggable={false}
              style={{
                position: "absolute",
                top: "69%",
                left: "calc(50% - clamp(8rem, 25vw, 38rem))",
                translate: "-50% -50%",
                width: "clamp(3rem, 5.4vw, 5.2rem)",
                height: "auto",
                opacity: 0.82,
                transformOrigin: "52% 82%",
                userSelect: "none",
              }}
              animate={
                hasEntered
                  ? {
                      y: [0, -1, -3, -1, 0],
                      x: [0, 1, 0, -1, 0],
                      rotate: [-3, -1, 2, 1, -3],
                      scale: [1, 1.015, 1.035, 1.01, 1],
                    }
                  : false
              }
              transition={{
                duration: 6.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.img
              src="/ladybug.png"
              alt=""
              className="khix-stage-accent-ladybug"
              width={68}
              height={55}
              draggable={false}
              style={{
                position: "absolute",
                top: "44.5%",
                left: "calc(50% + clamp(5.2rem, 19vw, 27rem))",
                translate: "-50% -50%",
                width:
                  "var(--khix-ladybug-width, clamp(1.45rem, 1.9vw, 2.25rem))",
                height: "auto",
                opacity: 0.94,
                transformOrigin: "45% 80%",
                userSelect: "none",
              }}
              animate={
                hasEntered
                  ? {
                      x: [-7, 0, 8, 18, 22, 14, -7],
                      y: [1, 0, 2, -1, 1, 3, 1],
                      rotate: [-8, -3, 6, -2, 7, -5, -8],
                      scale: [1, 1.02, 0.99, 1.02, 1, 0.98, 1],
                    }
                  : false
              }
              transition={{
                duration: 4.4,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.14, 0.28, 0.46, 0.58, 0.74, 1],
              }}
            />
          </div>

          <motion.div
            className="khix-hero-content"
            initial="hidden"
            animate={hasEntered ? "show" : "hidden"}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.1, delayChildren: 0.12 },
              },
            }}
          >
            <motion.div className="khix-logo-lockup" variants={reveal}>
              <Image
                src="/khix-logo-white.svg"
                alt="Knight Hacks IX"
                width={1858}
                height={666}
                priority
                unoptimized
                className="khix-logo-image"
              />
            </motion.div>
            <h1 className="sr-only">Knight Hacks IX</h1>
            <p className="sr-only">{SEO_DESCRIPTION}</p>
            <motion.div
              className="khix-event-date-lockup"
              variants={fadeReveal}
            >
              <p className="khix-event-date-text">October 9-11th, 2026</p>
              <p className="khix-event-location-text">
                University of Central Florida
              </p>
            </motion.div>
          </motion.div>

          <div className="khix-hero-actions">
            <motion.a
              href={APPLICATION_URL}
              className="khix-button khix-button-primary"
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="khix-button-label">Join Blade</span>
            </motion.a>
            <motion.a
              href={SPONSOR_URL}
              className="khix-button khix-button-secondary"
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="khix-button-label">Sponsor</span>
            </motion.a>
          </div>
          <a href={mlhCodeOfConductUrl} className="khix-code-link">
            MLH Code of Conduct
          </a>
          <nav className="khix-social-links" aria-label="Knight Hacks links">
            {socialLinks.map(({ label, href, Icon }) => (
              <motion.a
                key={label}
                href={href}
                className="khix-social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                whileHover={{ y: -2, scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
              </motion.a>
            ))}
            {hasEntered ? (
              <motion.button
                type="button"
                className="khix-audio-toggle khix-audio-toggle-row"
                onClick={toggleMusic}
                aria-label={isMusicPlaying ? "Stop music" : "Play music"}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 0.84, y: 0, scale: 1 }}
                transition={{ duration: 0.42, ease: "easeOut", delay: 0.35 }}
                whileHover={{ opacity: 1, y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                {isMusicPlaying ? (
                  <FaVolumeUp aria-hidden="true" size={17} strokeWidth={2.3} />
                ) : (
                  <FaVolumeMute
                    aria-hidden="true"
                    size={17}
                    strokeWidth={2.3}
                  />
                )}
              </motion.button>
            ) : null}
          </nav>
        </section>
      </div>

      <button
        type="button"
        className="khix-enter-gate"
        onClick={() => void startExperience()}
        aria-label="Enter Knight Hacks IX"
      >
        <span className="khix-enter-gate-aura" aria-hidden="true" />
        <span className="khix-enter-gate-content">
          Tap or press Space to enter the Knight Hacks experience
        </span>
      </button>
    </main>
  );
}

function MlhTrustBadge({ hasEntered }: { hasEntered: boolean }) {
  return (
    <motion.a
      id="mlh-trust-badge"
      className="khix-mlh-badge"
      href={mlhTrustBadgeUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: -48 }}
      animate={hasEntered ? { opacity: 1, y: 0 } : { opacity: 0, y: -48 }}
      transition={{
        duration: hasEntered ? 0.65 : 0,
        delay: hasEntered ? 0.2 : 0,
        ease: "easeOut",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- MLH serves the required trust badge as a remote SVG. */}
      <img
        src={mlhTrustBadgeImage}
        alt="Major League Hacking 2027 Hackathon Season"
        loading="eager"
        fetchPriority="high"
      />
    </motion.a>
  );
}
