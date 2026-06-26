"use client";

import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { forwardRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@forge/ui";

const MEMBER_ROUTE_TRANSITION_EVENT = "blade:member-route-transition";
const MEMBER_ROUTE_TRANSITION_DELAY_MS = 280;

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

export function MemberRouteTransitionSurface({
  children,
}: {
  children: ReactNode;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleTransitionStart = () => setIsExiting(true);

    window.addEventListener(
      MEMBER_ROUTE_TRANSITION_EVENT,
      handleTransitionStart,
    );

    return () => {
      window.removeEventListener(
        MEMBER_ROUTE_TRANSITION_EVENT,
        handleTransitionStart,
      );
    };
  }, []);

  return (
    <div
      data-member-route-exiting={isExiting}
      className={cn(
        "animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none",
        "will-change-opacity transition-opacity duration-300 ease-out motion-reduce:transition-none",
        isExiting && "opacity-0",
      )}
    >
      {children}
    </div>
  );
}

export const MemberRouteTransitionLink = forwardRef<
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
        "group transition-opacity duration-200 ease-out motion-reduce:transition-none",
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

        window.dispatchEvent(new Event(MEMBER_ROUTE_TRANSITION_EVENT));
        setIsExiting(true);
        window.setTimeout(
          () => router.push(href),
          MEMBER_ROUTE_TRANSITION_DELAY_MS,
        );
      }}
      {...props}
    />
  );
});
MemberRouteTransitionLink.displayName = "MemberRouteTransitionLink";
