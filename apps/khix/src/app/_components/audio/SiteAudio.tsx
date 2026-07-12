"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { AudioLayerId, LayerVolumes } from "./audio-scene";
import {
  AUDIO_LAYERS,
  AUDIO_ZONES,
  CROSSFADE_TAU,
  DEFAULT_ZONE_VOLUMES,
  MIN_ZONE_OVERLAP,
  PRIMARY_LAYER_ID,
} from "./audio-scene";
import styles from "./SiteAudio.module.css";
import {
  hydrateMutedFromStorage,
  isMuted,
  subscribeMuted,
  toggleMuted,
} from "./sound-state";

type AudioElements = Partial<Record<AudioLayerId, HTMLAudioElement | null>>;

/**
 * Pick the active zone's volumes, else the default. Among zones covering enough
 * of the viewport, the highest `priority` wins; coverage breaks ties within a
 * priority. This lets the prioritized waterfall beat the taller cave that
 * overlaps it, while still falling back to the cave once the waterfall scrolls off.
 */
function computeTargetVolumes(): LayerVolumes {
  const viewportHeight = window.innerHeight || 1;
  let bestVolumes = DEFAULT_ZONE_VOLUMES;
  let bestPriority = -1;
  let bestOverlap = 0;

  for (const zone of AUDIO_ZONES) {
    const element = document.querySelector(zone.selector);

    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    const overlap =
      Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
      ) / viewportHeight;

    if (overlap < MIN_ZONE_OVERLAP) {
      continue;
    }

    const priority = zone.priority ?? 0;

    if (
      priority > bestPriority ||
      (priority === bestPriority && overlap > bestOverlap)
    ) {
      bestPriority = priority;
      bestOverlap = overlap;
      bestVolumes = zone.volumes;
    }
  }

  return bestVolumes;
}

export function SiteAudio() {
  const audioRefs = useRef<AudioElements>({});
  const muted = useSyncExternalStore(
    subscribeMuted,
    isMuted,
    () => false, // Server + first client render: always unmuted, avoids mismatch.
  );
  // Tracks whether audio is actually audible, which lags `muted` because
  // browsers block autoplay until the first user gesture.
  const [isPlaying, setIsPlaying] = useState(false);

  // Crossfade the layer volumes toward whichever zone is in view.
  useEffect(() => {
    const target: LayerVolumes = { ...DEFAULT_ZONE_VOLUMES };
    const current: LayerVolumes = { ...DEFAULT_ZONE_VOLUMES };

    const applyVolumes = () => {
      for (const layer of AUDIO_LAYERS) {
        const audio = audioRefs.current[layer.id];

        if (audio) {
          audio.volume = current[layer.id];
        }
      }
    };

    // Snap to the correct mix for wherever the page loads (e.g. a #faq deep link).
    Object.assign(target, computeTargetVolumes());
    Object.assign(current, target);
    applyVolumes();

    let frame = 0;
    let lastTime = 0;

    const step = (time: number) => {
      const deltaSeconds = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;

      // Frame-rate independent exponential smoothing toward the target.
      const blend = 1 - Math.exp(-deltaSeconds / CROSSFADE_TAU);
      let settled = true;

      for (const layer of AUDIO_LAYERS) {
        const delta = target[layer.id] - current[layer.id];

        if (Math.abs(delta) < 0.001) {
          current[layer.id] = target[layer.id];
        } else {
          current[layer.id] += delta * blend;
          settled = false;
        }
      }

      applyVolumes();

      if (settled) {
        frame = 0; // Stop the loop until the target changes again.
        return;
      }

      frame = window.requestAnimationFrame(step);
    };

    const retarget = () => {
      const next = computeTargetVolumes();
      const changed = AUDIO_LAYERS.some(
        (layer) => Math.abs(next[layer.id] - target[layer.id]) > 0.001,
      );

      if (!changed) {
        return;
      }

      Object.assign(target, next);

      if (!frame) {
        lastTime = 0;
        frame = window.requestAnimationFrame(step);
      }
    };

    // Watch the zone elements; recompute the mix whenever their overlap shifts.
    const observer = new IntersectionObserver(retarget, {
      threshold: Array.from({ length: 21 }, (_, index) => index / 20),
    });

    for (const zone of AUDIO_ZONES) {
      const element = document.querySelector(zone.selector);

      if (element) {
        observer.observe(element);
      }
    }

    window.addEventListener("resize", retarget);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", retarget);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // Adopt any saved preference and mirror real playback state from the primary layer.
  useEffect(() => {
    hydrateMutedFromStorage();

    const primary = audioRefs.current[PRIMARY_LAYER_ID];

    if (!primary) {
      return;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    primary.addEventListener("play", handlePlay);
    primary.addEventListener("pause", handlePause);

    return () => {
      primary.removeEventListener("play", handlePlay);
      primary.removeEventListener("pause", handlePause);
    };
  }, []);

  // Keep every layer in sync with the mute state.
  useEffect(() => {
    for (const layer of AUDIO_LAYERS) {
      const audio = audioRefs.current[layer.id];

      if (!audio) {
        continue;
      }

      audio.muted = muted;

      if (muted) {
        audio.pause();
      } else {
        // Autoplay-with-sound is blocked until the user interacts with the page;
        // a rejected promise here is expected and handled by the gesture fallback.
        void audio.play().catch(() => undefined);
      }
    }
  }, [muted]);

  // Browsers block audio until the first user gesture. Start every layer on the
  // first interaction anywhere on the page (unless the user has muted).
  useEffect(() => {
    const startPlayback = () => {
      if (isMuted()) {
        return;
      }

      for (const layer of AUDIO_LAYERS) {
        void audioRefs.current[layer.id]?.play().catch(() => undefined);
      }
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
      {AUDIO_LAYERS.map((layer) => (
        <audio
          key={layer.id}
          ref={(element) => {
            audioRefs.current[layer.id] = element;
          }}
          src={layer.src}
          loop
          preload="auto"
        />
      ))}
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
