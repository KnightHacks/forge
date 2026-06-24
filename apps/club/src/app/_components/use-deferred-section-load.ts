"use client";

import { useEffect, useState } from "react";

interface DeferredSectionLoadOptions {
  leadViewports?: number;
}

function getVerticalRootMargin(viewportHeight: number, leadViewports: number) {
  const marginPx = Math.max(0, Math.round(viewportHeight * leadViewports));

  return `${marginPx}px 0px`;
}

export function useDeferredSectionLoad<TElement extends Element>({
  leadViewports = 0,
}: DeferredSectionLoadOptions = {}) {
  const [element, setElement] = useState<TElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    function updateViewportHeight() {
      setViewportHeight(window.innerHeight);
    }

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);

    return () => window.removeEventListener("resize", updateViewportHeight);
  }, []);

  useEffect(() => {
    if (!element || shouldLoad || viewportHeight <= 0) return;

    if (!("IntersectionObserver" in window)) {
      const fallbackId = globalThis.setTimeout(() => {
        setShouldLoad(true);
      }, 0);

      return () => globalThis.clearTimeout(fallbackId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setShouldLoad(true);
        observer.disconnect();
      },
      {
        rootMargin: getVerticalRootMargin(viewportHeight, leadViewports),
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [element, leadViewports, shouldLoad, viewportHeight]);

  return { ref: setElement, shouldLoad };
}
