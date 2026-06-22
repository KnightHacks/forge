"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal], [data-stagger], [data-motion-scope]";
const DRIFT_SELECTOR = "[data-scroll-drift]";
const HERO_SELECTOR = "[data-hero]";
const HISTORY_TIMELINE_SELECTOR = "[data-history-timeline]";
const HISTORY_MARKER_SELECTOR = "[data-history-marker]";
const TILT_SELECTOR = "[data-tilt]";

interface DriftState {
  element: HTMLElement;
  documentTop: number;
  height: number;
  depth: number;
}

interface HeroState {
  element: HTMLElement;
  documentTop: number;
  height: number;
}

interface TimelineState {
  element: HTMLElement;
  markers: HTMLElement[];
  documentTop: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ClubMotionRuntime() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;

    if (motionQuery.matches) {
      root.dataset.motion = "reduced";
      root.style.setProperty("--club-scroll-progress", "1");
      return;
    }

    const observedElements = new WeakSet<Element>();
    const revealElements = new Set<Element>();
    let driftElements: DriftState[] = [];
    let heroElements: HeroState[] = [];
    let timelines: TimelineState[] = [];
    let scrollableHeight = 0;

    function getDocumentTop(element: HTMLElement) {
      let documentTop = 0;
      let offsetElement: HTMLElement | null = element;

      while (offsetElement) {
        documentTop += offsetElement.offsetTop;
        offsetElement = offsetElement.offsetParent as HTMLElement | null;
      }

      return documentTop;
    }

    function refreshDocumentMetrics() {
      scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      );
    }

    function refreshScrollTargets() {
      refreshDocumentMetrics();
      driftElements = Array.from(
        document.querySelectorAll<HTMLElement>(DRIFT_SELECTOR),
      ).map((element) => ({
        element,
        documentTop: getDocumentTop(element),
        height: Math.max(element.offsetHeight, 1),
        depth: Number(element.dataset.scrollDrift ?? 12),
      }));
      heroElements = Array.from(
        document.querySelectorAll<HTMLElement>(HERO_SELECTOR),
      ).map((element) => ({
        element,
        documentTop: getDocumentTop(element),
        height: Math.max(element.offsetHeight, 1),
      }));
      timelines = Array.from(
        document.querySelectorAll<HTMLElement>(HISTORY_TIMELINE_SELECTOR),
      ).map((timeline) => ({
        element: timeline,
        markers: Array.from(
          timeline.querySelectorAll<HTMLElement>(HISTORY_MARKER_SELECTOR),
        ),
        documentTop: getDocumentTop(timeline),
        height: Math.max(timeline.offsetHeight, 1),
      }));
    }

    function revealElement(element: Element) {
      element.classList.add("is-visible");
      revealObserver.unobserve(element);
      revealElements.delete(element);
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          revealElement(entry.target);
        }
      },
      {
        rootMargin: "0px 0px 5% 0px",
        threshold: 0.04,
      },
    );

    function observeElement(element: Element) {
      if (observedElements.has(element)) return;

      observedElements.add(element);
      element.classList.add("is-motion-observed");
      revealElements.add(element);

      revealObserver.observe(element);
    }

    function observeTree(rootNode: ParentNode) {
      if (rootNode instanceof Element && rootNode.matches(REVEAL_SELECTOR)) {
        observeElement(rootNode);
      }

      rootNode
        .querySelectorAll(REVEAL_SELECTOR)
        .forEach((element) => observeElement(element));
    }

    observeTree(document);
    refreshScrollTargets();
    root.dataset.motion = "ready";
    const hasTiltTargets = document.querySelector(TILT_SELECTOR) !== null;

    const mutationObserver = new MutationObserver((mutations) => {
      let shouldRefreshScrollTargets = false;

      for (const mutation of mutations) {
        if (mutation.removedNodes.length > 0) {
          shouldRefreshScrollTargets = true;
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            observeTree(node);
            shouldRefreshScrollTargets = true;
          }
        }
      }

      if (shouldRefreshScrollTargets) {
        refreshScrollTargets();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    let scrollFrameId: number | null = null;

    function updateScrollMotion() {
      scrollFrameId = null;

      const scrollProgress =
        scrollableHeight > 0 ? window.scrollY / scrollableHeight : 1;

      root.style.setProperty(
        "--club-scroll-progress",
        String(clamp(scrollProgress, 0, 1)),
      );

      const viewportCenter = window.innerHeight / 2;
      const scrollY = window.scrollY;

      for (const drift of driftElements) {
        const top = drift.documentTop - scrollY;
        const bottom = top + drift.height;

        if (bottom < -200 || top > window.innerHeight + 200) {
          continue;
        }

        const elementCenter = top + drift.height / 2;
        const normalizedDistance = clamp(
          (viewportCenter - elementCenter) / viewportCenter,
          -1,
          1,
        );

        drift.element.style.setProperty(
          "--club-scroll-drift",
          `${(normalizedDistance * drift.depth).toFixed(2)}px`,
        );
      }

      for (const hero of heroElements) {
        const top = hero.documentTop - scrollY;
        const bottom = top + hero.height;

        if (bottom < 0 || top > window.innerHeight) {
          continue;
        }

        const heroProgress = clamp(-top / hero.height, 0, 1);

        hero.element.style.setProperty(
          "--club-hero-progress",
          heroProgress.toFixed(3),
        );
      }

      for (const timeline of timelines) {
        const viewportAnchor = window.innerHeight * 0.5;
        const viewportAnchorDocument = scrollY + viewportAnchor;

        if (
          viewportAnchorDocument < timeline.documentTop - window.innerHeight ||
          viewportAnchorDocument >
            timeline.documentTop + timeline.height + window.innerHeight
        ) {
          continue;
        }

        const progressY = clamp(
          viewportAnchorDocument - timeline.documentTop,
          0,
          timeline.height,
        );
        const scrubberY = clamp(
          progressY,
          21,
          Math.max(timeline.height - 21, 21),
        );
        const timelineProgress = progressY / timeline.height;

        timeline.element.style.setProperty(
          "--history-timeline-progress",
          timelineProgress.toFixed(4),
        );
        timeline.element.style.setProperty(
          "--history-timeline-scrubber-y",
          `${scrubberY.toFixed(2)}px`,
        );

        for (const marker of timeline.markers) {
          const markerProgress = Number(marker.dataset.historyMarker ?? 0);

          marker.classList.toggle(
            "is-history-marker-active",
            timelineProgress + 0.018 >= markerProgress,
          );
        }
      }
    }

    function scheduleScrollMotion() {
      if (scrollFrameId !== null) return;

      scrollFrameId = window.requestAnimationFrame(updateScrollMotion);
    }

    let tiltFrameId: number | null = null;
    let pendingTilt: {
      element: HTMLElement;
      x: number;
      y: number;
    } | null = null;

    function applyTilt() {
      tiltFrameId = null;

      if (!pendingTilt) return;

      const { element, x, y } = pendingTilt;
      element.style.setProperty("--tilt-x", y.toFixed(3));
      element.style.setProperty("--tilt-y", x.toFixed(3));
      element.style.setProperty("--tilt-glow-x", `${((x + 1) / 2) * 100}%`);
      element.style.setProperty("--tilt-glow-y", `${((y + 1) / 2) * 100}%`);
      pendingTilt = null;
    }

    function handlePointerMove(event: PointerEvent) {
      const target =
        event.target instanceof Element
          ? event.target.closest(TILT_SELECTOR)
          : null;

      if (!(target instanceof HTMLElement)) return;

      const rect = target.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;

      pendingTilt = { element: target, x, y };

      tiltFrameId ??= window.requestAnimationFrame(applyTilt);
    }

    function handlePointerOut(event: PointerEvent) {
      const target =
        event.target instanceof Element
          ? event.target.closest(TILT_SELECTOR)
          : null;

      if (!(target instanceof HTMLElement)) return;

      const relatedTarget = event.relatedTarget;

      if (relatedTarget instanceof Node && target.contains(relatedTarget)) {
        return;
      }

      target.style.removeProperty("--tilt-x");
      target.style.removeProperty("--tilt-y");
      target.style.removeProperty("--tilt-glow-x");
      target.style.removeProperty("--tilt-glow-y");
    }

    window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
    function handleResize() {
      refreshScrollTargets();
      scheduleScrollMotion();
    }

    window.addEventListener("resize", handleResize);
    if (hasTiltTargets) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerout", handlePointerOut);
    }
    scheduleScrollMotion();

    return () => {
      revealObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", scheduleScrollMotion);
      window.removeEventListener("resize", handleResize);

      if (hasTiltTargets) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerout", handlePointerOut);
      }

      if (scrollFrameId !== null) {
        window.cancelAnimationFrame(scrollFrameId);
      }

      if (tiltFrameId !== null) {
        window.cancelAnimationFrame(tiltFrameId);
      }
    };
  }, []);

  return <div className="club-scroll-progress" aria-hidden="true" />;
}
