"use client";

import { useEffect, useRef } from "react";

export default function useStaggeredAnimation(delay = 100) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const animatableChildren = element.querySelectorAll(".stagger-item");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animatableChildren.forEach((child, index) => {
              setTimeout(() => {
                if (child.classList.contains("animate-pop-out")) {
                  child.classList.remove("animate-pop-out");
                  requestAnimationFrame(() => {
                    child.classList.add("animate-pop-out");
                  });
                } else {
                  child.classList.add("animate-fade-in-up");
                }
              }, index * delay);
            });

            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.01, // Trigger when only 1% visible for immediate response
        rootMargin: "50px 0px 0px 0px", // Start animation 50px before element enters viewport
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay]);

  return elementRef;
}
