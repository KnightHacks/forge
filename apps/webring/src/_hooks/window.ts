import { useEffect, useState } from "react";

export function useIsSmall() {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    // Check if window exists (to avoid SSR issues)
    if (typeof window === "undefined") return;

    // Initial check
    const checkIfSmall = () => {
      setIsSmall(window.innerWidth < 810); // Common breakpoint for Small
    };

    // Set initial value
    checkIfSmall();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfSmall);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfSmall);
  }, []);

  return isSmall;
}

export function useIsMedium() {
  const [isMedium, setIsMedium] = useState(false);

  useEffect(() => {
    // Check if window exists (to avoid SSR issues)
    if (typeof window === "undefined") return;

    // Initial check
    const checkIfMedium = () => {
      setIsMedium(window.innerWidth >= 810 && window.innerWidth < 1024); // Common breakpoint for Medium
    };

    // Set initial value
    checkIfMedium();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMedium);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMedium);
  }, []);

  return isMedium;
}
