"use client";

import { useEffect, useRef, useState } from "react";

interface ViewportActivityOptions {
  once?: boolean;
  respectReducedMotion?: boolean;
  rootMargin?: string;
}

/**
 * Keeps decorative work active only while it can contribute to the page.
 * Document visibility is included so background tabs do not keep animating.
 */
/** Tracks whether an element is near the viewport and its document is visible. */
export function useViewportActivity<T extends Element>({
  once = false,
  respectReducedMotion = true,
  rootMargin = "20% 0px",
}: ViewportActivityOptions = {}) {
  const elementRef = useRef<T>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let isIntersecting = false;
    let observer: IntersectionObserver | null = null;

    /** Commits activity only when the target intersects and the tab is visible. */
    const updateActivity = () => {
      const nextIsActive =
        isIntersecting &&
        !document.hidden &&
        (!respectReducedMotion || !reducedMotionQuery.matches);

      if (once) {
        if (nextIsActive) {
          setIsActive(true);
          observer?.disconnect();
        }
        return;
      }

      setIsActive(nextIsActive);
    };

    observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              isIntersecting = entry?.isIntersecting ?? false;
              updateActivity();
            },
            { rootMargin, threshold: 0.01 },
          )
        : null;

    if (observer) {
      observer.observe(element);
    } else {
      isIntersecting = true;
      updateActivity();
    }

    document.addEventListener("visibilitychange", updateActivity);
    reducedMotionQuery.addEventListener("change", updateActivity);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      reducedMotionQuery.removeEventListener("change", updateActivity);
    };
  }, [once, respectReducedMotion, rootMargin]);

  return [elementRef, isActive] as const;
}
