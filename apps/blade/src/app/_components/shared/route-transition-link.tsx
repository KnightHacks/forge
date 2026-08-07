"use client";

import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { forwardRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@forge/ui";

const ROUTE_TRANSITION_EVENT = "blade:route-transition";
const ROUTE_TRANSITION_DELAY_MS = 80;

function shouldUseNormalLink(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0 ||
    event.currentTarget.target === "_blank"
  );
}

export function RouteTransitionSurface({ children }: { children: ReactNode }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleTransitionStart = () => setIsExiting(true);

    window.addEventListener(ROUTE_TRANSITION_EVENT, handleTransitionStart);

    return () => {
      window.removeEventListener(ROUTE_TRANSITION_EVENT, handleTransitionStart);
    };
  }, []);

  return (
    <div
      data-member-route-exiting={isExiting}
      aria-busy={isExiting}
      className={cn(
        "animate-in fade-in-0 duration-200 ease-out motion-reduce:animate-none",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        isExiting && "opacity-60",
      )}
    >
      {children}
    </div>
  );
}

export const RouteTransitionLink = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
    beforeNavigate?: () => boolean;
    href: string;
  }
>(({ beforeNavigate, className, href, onClick, ...props }, ref) => {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  return (
    <Link
      ref={ref}
      href={href}
      data-exiting={isExiting}
      className={cn(
        "group transition-opacity duration-150 ease-out motion-reduce:transition-none",
        "animate-in fade-in-0 motion-reduce:animate-none",
        isExiting && "opacity-70",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (shouldUseNormalLink(event)) return;

        if (beforeNavigate && !beforeNavigate()) {
          event.preventDefault();
          return;
        }

        event.preventDefault();

        if (
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          isExiting
        ) {
          router.push(href);
          return;
        }

        window.dispatchEvent(new Event(ROUTE_TRANSITION_EVENT));
        setIsExiting(true);
        window.setTimeout(() => router.push(href), ROUTE_TRANSITION_DELAY_MS);
      }}
      {...props}
    />
  );
});
RouteTransitionLink.displayName = "RouteTransitionLink";
