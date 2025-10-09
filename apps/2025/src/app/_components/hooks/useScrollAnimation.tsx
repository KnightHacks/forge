"use client";

import { useEffect, useRef } from "react";

export default function useScrollAnimation(animationClass: string) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Simple, performant intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add animation class when visible
            entry.target.classList.add(animationClass);
            // Stop observing once animated (like Framer's "once" behavior)
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% visible
        rootMargin: "0px 0px -50px 0px", // Trigger slightly before fully in view
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [animationClass]);

  return elementRef;
}
