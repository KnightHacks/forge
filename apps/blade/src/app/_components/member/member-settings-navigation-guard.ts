"use client";

import { useEffect } from "react";

/**
 * The href a same-tab, same-origin, in-app navigation click is headed for, or
 * `null` when the click is not one the settings form should intercept.
 *
 * Modified clicks, middle clicks, `target="_blank"`, downloads, cross-origin
 * destinations, and same-page links all keep their default behavior so the
 * guard never blocks a navigation the browser was going to handle itself.
 */
export function internalNavigationHrefFromClick(
  event: MouseEvent,
): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  ) {
    return null;
  }
  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (
    !anchor ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return null;
  }
  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return null;
  if (
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search
  ) {
    return null;
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

/**
 * Keeps unsaved member settings from being lost: warns on tab close/reload, and
 * intercepts in-app link clicks so the caller can offer save-or-discard first.
 *
 * `isMutationInFlight` suspends only the click interception — a save or delete
 * already running owns the navigation that follows it.
 *
 * `onInterceptNavigation` must be stable; it is a subscription dependency, so a
 * new identity per render re-attaches the document listener.
 */
export function useUnsavedChangesNavigationGuard({
  hasUnsavedChanges,
  isMutationInFlight,
  onInterceptNavigation,
}: {
  hasUnsavedChanges: boolean;
  isMutationInFlight: boolean;
  onInterceptNavigation: (href: string) => void;
}) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || isMutationInFlight) return;
    const interceptInternalNavigation = (event: MouseEvent) => {
      const href = internalNavigationHrefFromClick(event);
      if (href === null) return;
      event.preventDefault();
      onInterceptNavigation(href);
    };
    document.addEventListener("click", interceptInternalNavigation, true);
    return () =>
      document.removeEventListener("click", interceptInternalNavigation, true);
  }, [hasUnsavedChanges, isMutationInFlight, onInterceptNavigation]);
}
