"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal], [data-stagger], [data-motion-scope]";
const DRIFT_SELECTOR = "[data-scroll-drift]";
const TILT_SELECTOR = "[data-tilt]";

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

    function isInsideRevealRange(element: Element) {
      const rect = element.getBoundingClientRect();

      return rect.top < window.innerHeight * 1.05 && rect.bottom > 0;
    }

    function observeElement(element: Element) {
      if (observedElements.has(element)) return;

      observedElements.add(element);
      element.classList.add("is-motion-observed");
      revealElements.add(element);

      if (isInsideRevealRange(element)) {
        revealElement(element);
        return;
      }

      revealObserver.observe(element);
    }

    function revealVisibleElements() {
      for (const element of [...revealElements]) {
        if (isInsideRevealRange(element)) {
          revealElement(element);
        }
      }
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
    root.dataset.motion = "ready";

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            observeTree(node);
          }
        }
      }

      revealVisibleElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    let scrollFrameId: number | null = null;

    function updateScrollMotion() {
      scrollFrameId = null;
      revealVisibleElements();

      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress =
        scrollableHeight > 0 ? window.scrollY / scrollableHeight : 1;

      root.style.setProperty(
        "--club-scroll-progress",
        String(clamp(scrollProgress, 0, 1)),
      );

      const viewportCenter = window.innerHeight / 2;

      document
        .querySelectorAll<HTMLElement>(DRIFT_SELECTOR)
        .forEach((element) => {
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const depth = Number(element.dataset.scrollDrift ?? 12);
          const normalizedDistance = clamp(
            (viewportCenter - elementCenter) / viewportCenter,
            -1,
            1,
          );

          element.style.setProperty(
            "--club-scroll-drift",
            `${(normalizedDistance * depth).toFixed(2)}px`,
          );
        });
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
    window.addEventListener("resize", scheduleScrollMotion);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerout", handlePointerOut);
    scheduleScrollMotion();

    return () => {
      revealObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", scheduleScrollMotion);
      window.removeEventListener("resize", scheduleScrollMotion);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);

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
