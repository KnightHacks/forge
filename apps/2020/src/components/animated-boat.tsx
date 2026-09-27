"use client";

import type { AnimationItem } from "lottie-web";
import { useEffect, useRef } from "react";

export function AnimatedBoat({ mobile = false }: { mobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: AnimationItem | undefined;
    let cancelled = false;

    void import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;

      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: !window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
        path: "/assets/boat-characters.json",
        rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
      });
    });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="animated-boat"
      role="img"
      aria-label="Knight Hacks characters sailing in a boat"
      style={{ height: 350, width: mobile ? 300 : 350 }}
    />
  );
}
