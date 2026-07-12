"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import styles from "./SiteAudio.module.css";
import {
  hydrateMutedFromStorage,
  isMuted,
  subscribeMuted,
  toggleMuted,
} from "./sound-state";

/**
 * Swap this for the CDN URL (assets.knighthacks.org/khix/...) once the track is
 * uploaded there, to match the rest of the site's assets.
 */
const TRACK_SRC = "/audio/birds.mp3";

export function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const muted = useSyncExternalStore(
    subscribeMuted,
    isMuted,
    () => false, // Server + first client render: always unmuted, avoids mismatch.
  );
  // Tracks whether the track is actually audible, which lags `muted` because
  // browsers block autoplay until the first user gesture.
  const [isPlaying, setIsPlaying] = useState(false);

  // Set the level, adopt any saved preference, and mirror real playback state.
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = 0.5; // Volume can't be set via attribute.
    hydrateMutedFromStorage();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  // Keep the element in sync with the mute state.
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.muted = muted;

    if (muted) {
      audio.pause();
    } else {
      // Autoplay-with-sound is blocked until the user interacts with the page;
      // a rejected promise here is expected and handled by the gesture fallback.
      void audio.play().catch(() => undefined);
    }
  }, [muted]);

  // Browsers block audio until the first user gesture. Try to start playback on
  // the first interaction anywhere on the page (unless the user has muted).
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const startPlayback = () => {
      if (isMuted()) {
        return;
      }

      void audio.play().catch(() => undefined);
    };

    const events = ["pointerdown", "keydown", "touchstart"] as const;

    events.forEach((event) =>
      window.addEventListener(event, startPlayback, { once: true }),
    );

    // In case autoplay is permitted, try immediately too.
    startPlayback();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, startPlayback),
      );
    };
  }, []);

  // Sound is enabled but not yet audible (autoplay blocked, awaiting a gesture).
  const pending = !muted && !isPlaying;
  const label = muted
    ? "Unmute site sound"
    : pending
      ? "Sound on — tap to start"
      : "Mute site sound";

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} loop preload="auto" />
      <button
        type="button"
        className={styles.muteButton}
        onClick={toggleMuted}
        aria-pressed={muted}
        aria-label={label}
        title={muted ? "Unmute" : pending ? "Tap to start" : "Mute"}
        data-pending={pending}
      >
        {muted ? <MutedIcon /> : <SoundIcon />}
      </button>
    </>
  );
}

function SoundIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6.2a8 8 0 0 1 0 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 9.5l5 5m0-5l-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
