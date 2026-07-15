import type { PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

interface HeroMotion {
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  handlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  handlePointerLeave: () => void;
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const MOBILE_HERO_QUERY = "(max-width: 700px)";
const MOBILE_POINTER_QUERY = "(any-pointer: coarse)";
const PORTRAIT_QUERY = "(orientation: portrait)";
const VIEWPORT_UNIT_PROPERTY = "--khix-viewport-unit";
const VIEWPORT_WIDTH_UNIT_PROPERTY = "--khix-viewport-width-unit";

const getDocumentOffsetTop = (element: HTMLElement) => {
  let offsetTop = 0;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    offsetTop += currentElement.offsetTop;
    currentElement = currentElement.offsetParent as HTMLElement | null;
  }

  return offsetTop;
};

const setElementMotionNumber = (
  element: HTMLElement | null,
  property: string,
  value: number,
) => {
  element?.style.setProperty(property, value.toFixed(4));
};

export function useHeroMotion(): HeroMotion {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef({ x: 0, y: 0 });
  const shouldReduceMotionRef = useRef(false);
  const motionValuesRef = useRef({
    pointerX: 0,
    pointerY: 0,
    scrollProgress: 0,
  });

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const mobileQuery = window.matchMedia(MOBILE_HERO_QUERY);
    const mobilePointerQuery = window.matchMedia(MOBILE_POINTER_QUERY);
    const portraitQuery = window.matchMedia(PORTRAIT_QUERY);
    let firstFrame = 0;
    let secondFrame = 0;

    const updateStableViewportUnits = () => {
      if (!mobileQuery.matches) {
        section.style.removeProperty(VIEWPORT_UNIT_PROPERTY);
        section.style.removeProperty(VIEWPORT_WIDTH_UNIT_PROPERTY);
        return;
      }

      const visualViewport = window.visualViewport;
      const visibleViewportHeight =
        visualViewport?.height ?? window.innerHeight;
      // A touch-first phone's screen height stays stable while browser bars
      // expand and collapse, and keeps the hero tall enough to avoid seams.
      const viewportHeight = mobilePointerQuery.matches
        ? Math.max(visibleViewportHeight, window.screen.height)
        : visibleViewportHeight;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportUnit = Math.max(1, viewportHeight) / 100;
      const viewportWidthUnit = Math.max(1, viewportWidth) / 100;

      section.style.setProperty(
        VIEWPORT_UNIT_PROPERTY,
        `${viewportUnit.toFixed(4)}px`,
      );
      section.style.setProperty(
        VIEWPORT_WIDTH_UNIT_PROPERTY,
        `${viewportWidthUnit.toFixed(4)}px`,
      );
    };

    const cancelViewportFrames = () => {
      if (firstFrame) {
        window.cancelAnimationFrame(firstFrame);
        firstFrame = 0;
      }

      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
        secondFrame = 0;
      }
    };

    const scheduleStableViewportUnit = () => {
      cancelViewportFrames();
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          updateStableViewportUnits();
        });
      });
    };

    // Mobile browser chrome changes must not resize or recrop the hero.
    // Refresh the snapshot only when its breakpoint or orientation changes.
    updateStableViewportUnits();
    mobileQuery.addEventListener("change", scheduleStableViewportUnit);
    portraitQuery.addEventListener("change", scheduleStableViewportUnit);

    return () => {
      cancelViewportFrames();
      mobileQuery.removeEventListener("change", scheduleStableViewportUnit);
      portraitQuery.removeEventListener("change", scheduleStableViewportUnit);
      section.style.removeProperty(VIEWPORT_UNIT_PROPERTY);
      section.style.removeProperty(VIEWPORT_WIDTH_UNIT_PROPERTY);
    };
  }, []);

  const setPointerVars = (x: number, y: number) => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    const motionValues = motionValuesRef.current;

    if (
      Math.abs(motionValues.pointerX - x) < 0.001 &&
      Math.abs(motionValues.pointerY - y) < 0.001
    ) {
      return;
    }

    motionValues.pointerX = x;
    motionValues.pointerY = y;
    setElementMotionNumber(stage, "--khix-hero-pointer-x", x);
    setElementMotionNumber(stage, "--khix-hero-pointer-y", y);
    setElementMotionNumber(section, "--khix-hero-pointer-x", x);
    setElementMotionNumber(section, "--khix-hero-pointer-y", y);
  };

  const cancelPointerFrame = () => {
    if (!pointerFrameRef.current) {
      return;
    }

    window.cancelAnimationFrame(pointerFrameRef.current);
    pointerFrameRef.current = 0;
  };

  const schedulePointerVars = (x: number, y: number) => {
    pendingPointerRef.current = { x, y };

    if (pointerFrameRef.current) {
      return;
    }

    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = 0;
      setPointerVars(pendingPointerRef.current.x, pendingPointerRef.current.y);
    });
  };

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const section = sectionRef.current;
    const sectionTop = section ? getDocumentOffsetTop(section) : 0;
    let frame = 0;

    const setScrollProgressVar = (progress: number) => {
      const motionValues = motionValuesRef.current;

      if (Math.abs(motionValues.scrollProgress - progress) < 0.001) {
        return;
      }

      motionValues.scrollProgress = progress;
      setElementMotionNumber(
        stageRef.current,
        "--khix-hero-scroll-progress",
        progress,
      );
      setElementMotionNumber(
        sectionRef.current,
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

      const scrollableDistance = Math.max(1, section.offsetHeight);
      const progress = clamp(
        (window.scrollY - sectionTop) / scrollableDistance,
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

    shouldReduceMotionRef.current = reduceMotionQuery.matches;
    setPointerVars(0, 0);
    updateScrollProgress();

    const handleReducedMotionChange = () => {
      shouldReduceMotionRef.current = reduceMotionQuery.matches;

      if (reduceMotionQuery.matches) {
        cancelPointerFrame();
        setPointerVars(0, 0);
      }

      updateScrollProgress();
    };

    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    window.addEventListener("scroll", scheduleScrollProgress, {
      passive: true,
    });
    const sectionResizeObserver = new ResizeObserver(scheduleScrollProgress);
    if (section) {
      sectionResizeObserver.observe(section);
    }

    return () => {
      reduceMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      window.removeEventListener("scroll", scheduleScrollProgress);
      sectionResizeObserver.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      cancelPointerFrame();
      setPointerVars(0, 0);
      setScrollProgressVar(0);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (shouldReduceMotionRef.current || event.pointerType !== "mouse") {
      cancelPointerFrame();
      setPointerVars(0, 0);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = clamp(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      -1,
      1,
    );
    const nextY = clamp(
      ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
      -1,
      1,
    );

    schedulePointerVars(nextX, nextY);
  };

  const handlePointerLeave = () => {
    schedulePointerVars(0, 0);
  };

  return {
    sectionRef,
    stageRef,
    handlePointerMove,
    handlePointerLeave,
  };
}
