"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import BloomButtonEdge from "../ui/BloomButtonEdge";

gsap.registerPlugin(ScrollTrigger);

export default function DiscordCTAButton({
  label = "Join Our Discord!",
}: {
  label?: string;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buttonRef.current || !containerRef.current) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(buttonRef.current, { opacity: 1, x: 0, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, x: -120, y: 36 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 1.35,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            once: true,
          },
        },
      );
    }, containerRef);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex items-center justify-center py-10 sm:py-14 md:py-20"
    >
      <div ref={buttonRef} className="bloom-cta-shell">
        <div className="bloom-cta-frame">
          <div
            className="moving-border absolute inset-0 h-full w-full rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, #a8c490 0deg, #b8d4e8 120deg, #c9b8d8 240deg, #a8c490 360deg)",
            }}
          />
          <div className="relative z-10 flex w-full items-center">
            <button
              type="button"
              onClick={() =>
                window.open(
                  "https://discord.knighthacks.org/",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="wc-btn bloom-cta-button group"
            >
              <span className="bloom-cta-label transition-all duration-500 ease-in-out group-hover:text-white">
                {label}
              </span>
              <span className="bloom-cta-mark" aria-hidden="true" />
            </button>
          </div>
        </div>
        <BloomButtonEdge />
      </div>
    </section>
  );
}
