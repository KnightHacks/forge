"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

import type { AmbientVideoSource } from "./ambientVideoSources";
import { useViewportActivity } from "./useViewportActivity";

interface AmbientVideoProps {
  className?: string;
  poster?: string;
  preload?: "auto" | "metadata" | "none";
  rootMargin?: string;
  sources: readonly AmbientVideoSource[];
  style?: CSSProperties;
}

export function AmbientVideo({
  className,
  poster,
  preload = "none",
  rootMargin,
  sources,
  style,
}: AmbientVideoProps) {
  const [videoRef, isActive] = useViewportActivity<HTMLVideoElement>({
    rootMargin,
  });

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (!isActive) {
      video.pause();

      // Reset the media element after it leaves the viewport so decoded frame
      // buffers are released instead of accumulating as visitors scroll.
      video.load();

      return;
    }

    // Autoplay can still be rejected by browser policy or power-saving mode.
    // Static artwork underneath every ambient video is the visual fallback.
    void video.play().catch(() => undefined);
  }, [isActive, videoRef]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      muted
      loop
      playsInline
      poster={poster}
      preload={isActive ? preload : "none"}
      aria-hidden="true"
      data-active={isActive ? "true" : "false"}
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
    >
      {isActive
        ? sources.map((source) => (
            <source
              key={`${source.src}-${source.media ?? "all"}`}
              src={source.src}
              type={source.type}
              media={source.media}
            />
          ))
        : null}
    </video>
  );
}
