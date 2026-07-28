/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  internalNavigationHrefFromClick,
  useUnsavedChangesNavigationGuard,
} from "~/app/_components/member/member-settings-navigation-guard";

// The guard listens in the capture phase, so this bubble-phase listener runs
// after it: the click still reaches the guard undefaulted, and jsdom stops
// logging "Not implemented: navigation" for every click the guard lets through.
const swallowNavigation = (event: Event) => event.preventDefault();

beforeEach(() => {
  document.addEventListener("click", swallowNavigation);
});

afterEach(() => {
  document.removeEventListener("click", swallowNavigation);
  document.body.innerHTML = "";
});

function clickAnchor(
  attributes: Record<string, string>,
  init: MouseEventInit = {},
  children = "Link text",
) {
  const anchor = document.createElement("a");
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  anchor.innerHTML = `<span>${children}</span>`;
  document.body.append(anchor);

  let href: string | null | undefined;
  const capture = (event: Event) => {
    href = internalNavigationHrefFromClick(event as MouseEvent);
  };
  document.addEventListener("click", capture, true);
  // Clicking the inner span proves the anchor is found by ancestry, which is how
  // every real click on an icon-and-label link arrives.
  anchor.querySelector("span")?.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
  document.removeEventListener("click", capture, true);
  return href;
}

describe("internalNavigationHrefFromClick", () => {
  it("returns the in-app destination for a plain left click on a link", () => {
    expect(clickAnchor({ href: "/member/dashboard?tab=events#career" })).toBe(
      "/member/dashboard?tab=events#career",
    );
  });

  it("ignores clicks that were already handled", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/member/dashboard");
    document.body.append(anchor);

    let href: string | null | undefined;
    const preventFirst = (event: Event) => event.preventDefault();
    const capture = (event: Event) => {
      href = internalNavigationHrefFromClick(event as MouseEvent);
    };
    document.addEventListener("click", preventFirst, true);
    document.addEventListener("click", capture, true);
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    document.removeEventListener("click", preventFirst, true);
    document.removeEventListener("click", capture, true);

    expect(href).toBeNull();
  });

  it("ignores clicks the browser would not navigate the current tab with", () => {
    const href = "/member/dashboard";
    expect(clickAnchor({ href }, { metaKey: true })).toBeNull();
    expect(clickAnchor({ href }, { ctrlKey: true })).toBeNull();
    expect(clickAnchor({ href }, { shiftKey: true })).toBeNull();
    expect(clickAnchor({ href }, { altKey: true })).toBeNull();
    expect(clickAnchor({ href }, { button: 1 })).toBeNull();
  });

  it("ignores new-tab links, downloads, and non-link clicks", () => {
    expect(
      clickAnchor({ href: "/member/dashboard", target: "_blank" }),
    ).toBeNull();
    expect(clickAnchor({ href: "/api/resume.pdf", download: "" })).toBeNull();

    const orphan = document.createElement("button");
    document.body.append(orphan);
    let href: string | null | undefined;
    const capture = (event: Event) => {
      href = internalNavigationHrefFromClick(event as MouseEvent);
    };
    document.addEventListener("click", capture, true);
    orphan.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    document.removeEventListener("click", capture, true);
    expect(href).toBeNull();
  });

  it("ignores cross-origin links", () => {
    expect(clickAnchor({ href: "https://guild.knighthacks.org" })).toBeNull();
  });

  it("ignores same-page links so an in-page anchor still jumps", () => {
    const { pathname, search } = window.location;
    expect(clickAnchor({ href: `${pathname}${search}#career` })).toBeNull();
  });
});

function GuardHarness({
  hasUnsavedChanges,
  isMutationInFlight = false,
  onInterceptNavigation,
}: {
  hasUnsavedChanges: boolean;
  isMutationInFlight?: boolean;
  onInterceptNavigation: (href: string) => void;
}) {
  useUnsavedChangesNavigationGuard({
    hasUnsavedChanges,
    isMutationInFlight,
    onInterceptNavigation,
  });

  return <a href="/member/dashboard">Dashboard</a>;
}

function clickDashboardLink() {
  return fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
}

describe("useUnsavedChangesNavigationGuard", () => {
  it("blocks an in-app link and reports where the click was headed", () => {
    const onInterceptNavigation = vi.fn();
    render(
      <GuardHarness
        hasUnsavedChanges
        onInterceptNavigation={onInterceptNavigation}
      />,
    );

    const notCancelled = clickDashboardLink();

    expect(notCancelled).toBe(false);
    expect(onInterceptNavigation).toHaveBeenCalledWith("/member/dashboard");
  });

  it("lets navigation through once there is nothing unsaved", () => {
    const onInterceptNavigation = vi.fn();
    const { rerender } = render(
      <GuardHarness
        hasUnsavedChanges
        onInterceptNavigation={onInterceptNavigation}
      />,
    );

    rerender(
      <GuardHarness
        hasUnsavedChanges={false}
        onInterceptNavigation={onInterceptNavigation}
      />,
    );
    clickDashboardLink();

    expect(onInterceptNavigation).not.toHaveBeenCalled();
  });

  it("stands down while a save or delete is in flight", () => {
    const onInterceptNavigation = vi.fn();
    render(
      <GuardHarness
        hasUnsavedChanges
        isMutationInFlight
        onInterceptNavigation={onInterceptNavigation}
      />,
    );

    clickDashboardLink();

    expect(onInterceptNavigation).not.toHaveBeenCalled();
  });

  it("stops listening after unmount", () => {
    const onInterceptNavigation = vi.fn();
    const { unmount } = render(
      <GuardHarness
        hasUnsavedChanges
        onInterceptNavigation={onInterceptNavigation}
      />,
    );
    unmount();

    const link = document.createElement("a");
    link.setAttribute("href", "/member/dashboard");
    document.body.append(link);
    fireEvent.click(link);

    expect(onInterceptNavigation).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm a tab close while changes are unsaved", () => {
    const onInterceptNavigation = vi.fn();
    const { rerender } = render(
      <GuardHarness
        hasUnsavedChanges
        onInterceptNavigation={onInterceptNavigation}
      />,
    );

    const warned = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(warned);
    expect(warned.defaultPrevented).toBe(true);

    rerender(
      <GuardHarness
        hasUnsavedChanges={false}
        onInterceptNavigation={onInterceptNavigation}
      />,
    );
    const notWarned = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(notWarned);
    expect(notWarned.defaultPrevented).toBe(false);
  });
});
