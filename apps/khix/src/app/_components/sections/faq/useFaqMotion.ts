import type { PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

interface FaqMotion {
  motionLayerRef: RefObject<HTMLDivElement | null>;
  handlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  handlePointerLeave: () => void;
}

const setMotionNumber = (
  element: HTMLElement | null,
  property: string,
  value: number,
) => {
  element?.style.setProperty(property, value.toFixed(4));
};

export function useFaqMotion(): FaqMotion {
  const motionLayerRef = useRef<HTMLDivElement>(null);
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef({ x: 0, y: 0 });
  const shouldReduceMotionRef = useRef(false);
  const motionValuesRef = useRef({
    pointerX: 0,
    pointerY: 0,
  });

  const setPointerVars = (x: number, y: number) => {
    const motionValues = motionValuesRef.current;

    if (
      Math.abs(motionValues.pointerX - x) < 0.001 &&
      Math.abs(motionValues.pointerY - y) < 0.001
    ) {
      return;
    }

    motionValues.pointerX = x;
    motionValues.pointerY = y;
    setMotionNumber(motionLayerRef.current, "--faq-motion-pointer-x", x);
    setMotionNumber(motionLayerRef.current, "--faq-motion-pointer-y", y);
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

    shouldReduceMotionRef.current = reduceMotionQuery.matches;
    setPointerVars(0, 0);

    const handleReducedMotionChange = () => {
      shouldReduceMotionRef.current = reduceMotionQuery.matches;

      if (reduceMotionQuery.matches) {
        cancelPointerFrame();
        setPointerVars(0, 0);
      }
    };

    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);

    return () => {
      reduceMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      cancelPointerFrame();
      setPointerVars(0, 0);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (shouldReduceMotionRef.current) {
      cancelPointerFrame();
      setPointerVars(0, 0);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    schedulePointerVars(nextX, nextY);
  };

  const handlePointerLeave = () => {
    schedulePointerVars(0, 0);
  };

  return {
    motionLayerRef,
    handlePointerMove,
    handlePointerLeave,
  };
}
