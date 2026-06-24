import type { PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

interface HeroMotion {
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  handlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  handlePointerLeave: () => void;
}

const HERO_MOTION_STYLE_ID = "khix-hero-motion-vars";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const getViewportHeight = () =>
  window.visualViewport?.height ?? window.innerHeight;

const createMotionRule = () => {
  let style = document.getElementById(
    HERO_MOTION_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = HERO_MOTION_STYLE_ID;
    style.textContent =
      ":root{--khix-hero-pointer-x:0;--khix-hero-pointer-y:0;--khix-hero-scroll-progress:0;}";
    document.head.append(style);
  }

  return Array.from(style.sheet?.cssRules ?? []).find(
    (rule): rule is CSSStyleRule =>
      "selectorText" in rule && rule.selectorText === ":root",
  );
};

const setMotionRuleNumber = (
  rule: CSSStyleRule | null,
  property: string,
  value: number,
) => {
  rule?.style.setProperty(property, value.toFixed(4));
};

export function useHeroMotion(): HeroMotion {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const motionRuleRef = useRef<CSSStyleRule | null>(null);
  const shouldReduceMotionRef = useRef(false);
  const motionValuesRef = useRef({
    pointerX: 0,
    pointerY: 0,
    scrollProgress: 0,
  });

  const setPointerVars = (x: number, y: number) => {
    const motionRule = motionRuleRef.current;
    const motionValues = motionValuesRef.current;

    if (
      Math.abs(motionValues.pointerX - x) < 0.001 &&
      Math.abs(motionValues.pointerY - y) < 0.001
    ) {
      return;
    }

    motionValues.pointerX = x;
    motionValues.pointerY = y;
    setMotionRuleNumber(motionRule, "--khix-hero-pointer-x", x);
    setMotionRuleNumber(motionRule, "--khix-hero-pointer-y", y);
  };

  useEffect(() => {
    const motionRule = createMotionRule();
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let frame = 0;

    const setScrollProgressVar = (progress: number) => {
      const motionValues = motionValuesRef.current;

      if (Math.abs(motionValues.scrollProgress - progress) < 0.001) {
        return;
      }

      motionValues.scrollProgress = progress;
      setMotionRuleNumber(
        motionRuleRef.current,
        "--khix-hero-scroll-progress",
        progress,
      );
    };

    const updateScrollProgress = () => {
      const section = sectionRef.current;

      if (!section || shouldReduceMotionRef.current) {
        setScrollProgressVar(0);
        return;
      }

      const viewportHeight = getViewportHeight();
      const scrollableDistance = Math.max(1, viewportHeight);
      const progress = clamp(
        -section.getBoundingClientRect().top / scrollableDistance,
      );

      setScrollProgressVar(progress);
    };

    const scheduleScrollProgress = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateScrollProgress();
      });
    };

    motionRuleRef.current = motionRule ?? null;
    shouldReduceMotionRef.current = reduceMotionQuery.matches;
    setPointerVars(0, 0);
    updateScrollProgress();

    const handleReducedMotionChange = () => {
      shouldReduceMotionRef.current = reduceMotionQuery.matches;

      if (reduceMotionQuery.matches) {
        setPointerVars(0, 0);
      }

      updateScrollProgress();
    };

    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    window.addEventListener("scroll", scheduleScrollProgress, {
      passive: true,
    });
    window.addEventListener("resize", scheduleScrollProgress);
    window.visualViewport?.addEventListener("resize", scheduleScrollProgress);

    return () => {
      reduceMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      window.removeEventListener("scroll", scheduleScrollProgress);
      window.removeEventListener("resize", scheduleScrollProgress);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleScrollProgress,
      );
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      setPointerVars(0, 0);
      setScrollProgressVar(0);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (shouldReduceMotionRef.current) {
      setPointerVars(0, 0);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    setPointerVars(nextX, nextY);
  };

  const handlePointerLeave = () => {
    setPointerVars(0, 0);
  };

  return {
    sectionRef,
    stageRef,
    handlePointerMove,
    handlePointerLeave,
  };
}
