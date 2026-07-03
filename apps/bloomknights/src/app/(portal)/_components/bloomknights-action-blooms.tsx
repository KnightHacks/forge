"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

const ACTION_CLASS_NAME = "bk-bloom-cta-action";

const buttonBloomPositions = [
  "left",
  "top-left",
  "top-center",
  "top-right",
  "right",
  "bottom-right",
  "bottom-center",
  "bottom-left",
] as const;

type BloomPosition = (typeof buttonBloomPositions)[number];

interface ActionBloomGroup {
  buttonId: number;
  height: number;
  id: number;
  left: number;
  top: number;
  width: number;
}

interface BloomGroupStyle extends CSSProperties {
  "--bk-bloom-button-height": string;
  "--bk-bloom-button-left": string;
  "--bk-bloom-button-top": string;
  "--bk-bloom-button-width": string;
}

interface FlowerStyle extends CSSProperties {
  "--bk-bloom-delay": string;
  "--bk-bloom-rotate": string;
  "--bk-bloom-rotate-end": string;
  "--bk-bloom-size": string;
}

const flowerStyles: Record<BloomPosition, FlowerStyle> = {
  left: {
    "--bk-bloom-delay": "25ms",
    "--bk-bloom-rotate": "-48deg",
    "--bk-bloom-rotate-end": "-12deg",
    "--bk-bloom-size": "1.65rem",
    left: "1%",
    top: "50%",
  },
  "top-left": {
    "--bk-bloom-delay": "70ms",
    "--bk-bloom-rotate": "-34deg",
    "--bk-bloom-rotate-end": "8deg",
    "--bk-bloom-size": "1.85rem",
    left: "12%",
    top: "2%",
  },
  "top-center": {
    "--bk-bloom-delay": "125ms",
    "--bk-bloom-rotate": "28deg",
    "--bk-bloom-rotate-end": "-8deg",
    "--bk-bloom-size": "1.45rem",
    left: "38%",
    top: "-6%",
  },
  "top-right": {
    "--bk-bloom-delay": "180ms",
    "--bk-bloom-rotate": "42deg",
    "--bk-bloom-rotate-end": "12deg",
    "--bk-bloom-size": "1.8rem",
    left: "82%",
    top: "1%",
  },
  right: {
    "--bk-bloom-delay": "235ms",
    "--bk-bloom-rotate": "64deg",
    "--bk-bloom-rotate-end": "18deg",
    "--bk-bloom-size": "1.6rem",
    left: "99%",
    top: "50%",
  },
  "bottom-right": {
    "--bk-bloom-delay": "290ms",
    "--bk-bloom-rotate": "76deg",
    "--bk-bloom-rotate-end": "16deg",
    "--bk-bloom-size": "1.9rem",
    left: "86%",
    top: "99%",
  },
  "bottom-center": {
    "--bk-bloom-delay": "345ms",
    "--bk-bloom-rotate": "-18deg",
    "--bk-bloom-rotate-end": "10deg",
    "--bk-bloom-size": "1.45rem",
    left: "58%",
    top: "106%",
  },
  "bottom-left": {
    "--bk-bloom-delay": "400ms",
    "--bk-bloom-rotate": "-68deg",
    "--bk-bloom-rotate-end": "-14deg",
    "--bk-bloom-size": "1.75rem",
    left: "18%",
    top: "99%",
  },
};

function getActionElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(`.${ACTION_CLASS_NAME}`);
}

function getBloomGroupForElement(
  element: Element,
  buttonId: number,
  groupId: number,
): ActionBloomGroup {
  const rect = element.getBoundingClientRect();

  return {
    buttonId,
    height: rect.height,
    id: groupId,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function getBloomGroupStyle(group: ActionBloomGroup): BloomGroupStyle {
  return {
    "--bk-bloom-button-height": `${group.height}px`,
    "--bk-bloom-button-left": `${group.left}px`,
    "--bk-bloom-button-top": `${group.top}px`,
    "--bk-bloom-button-width": `${group.width}px`,
  };
}

export function BloomKnightsActionBlooms() {
  const [bloomGroups, setBloomGroups] = useState<ActionBloomGroup[]>([]);
  const buttonIdsRef = useRef(new WeakMap<Element, number>());
  const counterRef = useRef(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || isCoarsePointer) {
      return;
    }

    const getButtonId = (element: Element) => {
      const existingId = buttonIdsRef.current.get(element);

      if (existingId != null) {
        return existingId;
      }

      const nextId = counterRef.current++;
      buttonIdsRef.current.set(element, nextId);
      return nextId;
    };

    const addBloom = (element: Element) => {
      const buttonId = getButtonId(element);
      const bloomGroup = getBloomGroupForElement(
        element,
        buttonId,
        counterRef.current++,
      );

      setBloomGroups((currentGroups) => [
        ...currentGroups.filter((group) => group.buttonId !== buttonId),
        bloomGroup,
      ]);
    };

    const removeBloom = (element: Element) => {
      const buttonId = buttonIdsRef.current.get(element);

      if (buttonId == null) {
        return;
      }

      setBloomGroups((currentGroups) =>
        currentGroups.filter((group) => group.buttonId !== buttonId),
      );
    };

    const removeAllBlooms = () => {
      setBloomGroups([]);
    };

    const handlePointerOver = (event: PointerEvent) => {
      const actionElement = getActionElement(event.target);

      if (!actionElement) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        actionElement.contains(event.relatedTarget)
      ) {
        return;
      }

      addBloom(actionElement);
    };

    const handlePointerOut = (event: PointerEvent) => {
      const actionElement = getActionElement(event.target);

      if (!actionElement) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        actionElement.contains(event.relatedTarget)
      ) {
        return;
      }

      removeBloom(actionElement);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const actionElement = getActionElement(event.target);

      if (actionElement) {
        addBloom(actionElement);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const actionElement = getActionElement(event.target);

      if (!actionElement) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        actionElement.contains(event.relatedTarget)
      ) {
        return;
      }

      removeBloom(actionElement);
    };

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", removeAllBlooms);
    window.addEventListener("scroll", removeAllBlooms, true);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", removeAllBlooms);
      window.removeEventListener("scroll", removeAllBlooms, true);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes bkActionBloomFlower {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.18) rotate(var(--bk-bloom-rotate));
          }

          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(var(--bk-bloom-rotate-end));
          }
        }

        .bk-action-bloom-group {
          position: fixed;
          left: var(--bk-bloom-button-left);
          top: var(--bk-bloom-button-top);
          z-index: 99997;
          width: var(--bk-bloom-button-width);
          height: var(--bk-bloom-button-height);
          pointer-events: none;
          overflow: visible;
          border-radius: 9999px;
        }

        .bk-action-bloom-flower {
          position: absolute;
          width: var(--bk-bloom-size);
          height: var(--bk-bloom-size);
          opacity: 0;
          filter: drop-shadow(0 0.35rem 0.45rem rgba(82, 109, 48, 0.22));
          transform: translate(-50%, -50%) scale(0.18) rotate(var(--bk-bloom-rotate));
          transform-origin: center;
          animation: bkActionBloomFlower 550ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
          animation-delay: var(--bk-bloom-delay);
          will-change: transform, opacity;
        }

        .bk-action-bloom-flower::before {
          content: "";
          position: absolute;
          inset: 13%;
          border-radius: 9999px;
          background:
            radial-gradient(circle at 50% 50%, #fcbc4e 0 16%, transparent 17%),
            radial-gradient(circle at 50% 10%, #fdc0fd 0 22%, transparent 23%),
            radial-gradient(circle at 88% 50%, #fe73fe 0 21%, transparent 22%),
            radial-gradient(circle at 50% 88%, #dae494 0 22%, transparent 23%),
            radial-gradient(circle at 12% 50%, #a8d471 0 21%, transparent 22%);
        }

        .bk-action-bloom-flower::after {
          content: "";
          position: absolute;
          right: 4%;
          bottom: 12%;
          width: 42%;
          height: 22%;
          border-radius: 9999px 0;
          background: linear-gradient(135deg, rgba(122, 171, 90, 0.92), transparent);
          transform: rotate(28deg);
        }

        @media (prefers-reduced-motion: reduce), (pointer: coarse) {
          .bk-action-bloom-group {
            display: none;
          }
        }
      `}</style>
      {bloomGroups.map((group) => (
        <div
          key={group.id}
          aria-hidden="true"
          className="bk-action-bloom-group"
          style={getBloomGroupStyle(group)}
        >
          {buttonBloomPositions.map((position) => (
            <span
              key={position}
              className="bk-action-bloom-flower"
              style={flowerStyles[position]}
            />
          ))}
        </div>
      ))}
    </>
  );
}
