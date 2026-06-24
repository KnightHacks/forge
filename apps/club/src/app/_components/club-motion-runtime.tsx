"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal], [data-stagger], [data-motion-scope]";
const DRIFT_SELECTOR = "[data-scroll-drift]";
const HERO_SELECTOR = "[data-hero]";
const HISTORY_TIMELINE_SELECTOR = "[data-history-timeline]";
const HISTORY_MARKER_SELECTOR = "[data-history-marker]";
const HISTORY_SCRUBBER_SELECTOR = ".club-history-timeline-scrubber";
const TILT_SELECTOR = "[data-tilt]";
const DEFAULT_DRIFT_DEPTH_PX = 12;
const DRIFT_OVERSCAN_VIEWPORT_RATIO = 0.25;
const TIMELINE_VIEWPORT_ANCHOR_RATIO = 0.5;

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
  scrubberHalfHeight: number;
  markerLeadProgress: number;
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
        depth: Number(element.dataset.scrollDrift ?? DEFAULT_DRIFT_DEPTH_PX),
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
      ).map((timeline) => {
        const height = Math.max(timeline.offsetHeight, 1);
        const scrubber = timeline.querySelector<HTMLElement>(
          HISTORY_SCRUBBER_SELECTOR,
        );
        const scrubberHalfHeight = (scrubber?.offsetHeight ?? 0) / 2;

        return {
          element: timeline,
          markers: Array.from(
            timeline.querySelectorAll<HTMLElement>(HISTORY_MARKER_SELECTOR),
          ),
          documentTop: getDocumentTop(timeline),
          height,
          scrubberHalfHeight,
          markerLeadProgress: scrubberHalfHeight / height,
        };
      });
    }

    function revealElement(element: Element) {
      element.classList.add("is-visible");
      revealObserver.unobserve(element);
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
        syncTiltListeners();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    let scrollFrameId: number | null = null;
    let resizeRefreshFrameId: number | null = null;

    function updateScrollMotion() {
      scrollFrameId = null;

      const scrollProgress =
        scrollableHeight > 0 ? window.scrollY / scrollableHeight : 1;

      root.style.setProperty(
        "--club-scroll-progress",
        String(clamp(scrollProgress, 0, 1)),
      );

      const viewportCenter = window.innerHeight / 2;
      const driftOverscan = window.innerHeight * DRIFT_OVERSCAN_VIEWPORT_RATIO;
      const scrollY = window.scrollY;

      for (const drift of driftElements) {
        const top = drift.documentTop - scrollY;
        const bottom = top + drift.height;

        if (
          bottom < -driftOverscan ||
          top > window.innerHeight + driftOverscan
        ) {
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
        const viewportAnchor =
          window.innerHeight * TIMELINE_VIEWPORT_ANCHOR_RATIO;
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
          timeline.scrubberHalfHeight,
          Math.max(
            timeline.height - timeline.scrubberHalfHeight,
            timeline.scrubberHalfHeight,
          ),
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
            timelineProgress + timeline.markerLeadProgress >= markerProgress,
          );
        }
      }
    }

    function scheduleScrollMotion() {
      if (scrollFrameId !== null) return;

      scrollFrameId = window.requestAnimationFrame(updateScrollMotion);
    }

    function scheduleScrollTargetRefresh() {
      if (resizeRefreshFrameId !== null) return;

      resizeRefreshFrameId = window.requestAnimationFrame(() => {
        resizeRefreshFrameId = null;
        refreshScrollTargets();
        scheduleScrollMotion();
      });
    }

    let tiltFrameId: number | null = null;
    let tiltListenersAttached = false;
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

    function attachTiltListeners() {
      if (tiltListenersAttached) return;

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerout", handlePointerOut);
      tiltListenersAttached = true;
    }

    function detachTiltListeners() {
      if (!tiltListenersAttached) return;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      tiltListenersAttached = false;
      pendingTilt = null;

      if (tiltFrameId !== null) {
        window.cancelAnimationFrame(tiltFrameId);
        tiltFrameId = null;
      }
    }

    function syncTiltListeners() {
      if (document.querySelector(TILT_SELECTOR)) {
        attachTiltListeners();
      } else {
        detachTiltListeners();
      }
    }

    window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
    function handleResize() {
      refreshScrollTargets();
      scheduleScrollMotion();
    }

    window.addEventListener("resize", handleResize);
    const resizeObserver =
      "ResizeObserver" in window
        ? new ResizeObserver(scheduleScrollTargetRefresh)
        : null;
    resizeObserver?.observe(document.documentElement);
    resizeObserver?.observe(document.body);
    syncTiltListeners();
    scheduleScrollMotion();

    return () => {
      revealObserver.disconnect();
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleScrollMotion);
      window.removeEventListener("resize", handleResize);
      detachTiltListeners();

      if (scrollFrameId !== null) {
        window.cancelAnimationFrame(scrollFrameId);
      }

      if (resizeRefreshFrameId !== null) {
        window.cancelAnimationFrame(resizeRefreshFrameId);
      }
    };
  }, []);

  return <div className="club-scroll-progress" aria-hidden="true" />;
}
