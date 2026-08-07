"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@forge/ui";

const MAX_REVEAL_DELAY_MS = 240;

function boundedDelay(delay: number) {
  return Math.min(Math.max(delay, 0), MAX_REVEAL_DELAY_MS);
}

function MotionContainer({
  children,
  className,
  delay,
  motionRef,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
  motionRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={motionRef}
      data-motion-container=""
      className={cn(
        "transition-[opacity,transform] duration-[420ms] ease-out",
        "motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none",
        "translate-y-0 opacity-100",
        "data-[motion-state=pending]:translate-y-3 data-[motion-state=pending]:opacity-0",
        "data-[motion-state=visible]:translate-y-0 data-[motion-state=visible]:opacity-100",
        className,
      )}
      style={{
        transitionDelay: `${boundedDelay(delay)}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** A restrained first-paint entrance for public page regions. */
export function PageEntrance({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;
    if (!node) return;

    // Imperative data attributes keep the server render visible when JS is
    // unavailable while still hiding before the first hydrated paint.
    node.dataset.motionState = "pending";
    const frame = window.requestAnimationFrame(() => {
      node.dataset.motionState = "visible";
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <MotionContainer className={className} delay={delay} motionRef={ref}>
      {children}
    </MotionContainer>
  );
}

/** Reveals public/editorial content once as it enters the viewport. */
export function RevealOnView({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!("IntersectionObserver" in window) || reducedMotion) return;

    node.dataset.motionState = "pending";

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        node.dataset.motionState = "visible";
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <MotionContainer motionRef={ref} className={className} delay={delay}>
      {children}
    </MotionContainer>
  );
}
