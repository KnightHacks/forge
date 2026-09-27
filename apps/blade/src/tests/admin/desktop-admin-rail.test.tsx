/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesktopAdminNavigation } from "~/app/_components/shared/desktop-admin-navigation";

const navigation = vi.hoisted(() => ({ pathname: "/admin/members" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) =>
    createElement("a", props, children),
}));

// jsdom logs "Not implemented: navigation" for every real anchor activation.
const swallowNavigation = (event: Event) => event.preventDefault();

beforeEach(() => {
  navigation.pathname = "/admin/members";
  document.addEventListener("click", swallowNavigation);
});

afterEach(() => {
  document.removeEventListener("click", swallowNavigation);
});

const access = { hackathon: true, issues: true, members: true };

describe("desktop admin rail", () => {
  it("TC-003 starts collapsed and exposes every destination by name", async () => {
    render(createElement(DesktopAdminNavigation, { access }));

    const opener = screen.getByRole("button", { name: "Expand navigation" });

    expect(opener).toHaveAttribute("aria-expanded", "false");
    // A collapsed icon is still a named, directly activatable destination.
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute(
      "href",
      "/admin/members",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/member/dashboard",
    );

    // Hovering the rail must not expand it.
    await userEvent.hover(screen.getByRole("navigation", { name: "Primary" }));
    expect(opener).toHaveAttribute("aria-expanded", "false");

    // Nor may moving focus into it.
    await userEvent.tab();
    await userEvent.tab();
    expect(opener).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-003 expands only from the opener and closes after a selection", async () => {
    render(createElement(DesktopAdminNavigation, { access }));

    await userEvent.click(
      screen.getByRole("button", { name: "Expand navigation" }),
    );

    const opener = screen.getByRole("button", { name: "Collapse navigation" });
    expect(opener).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Club" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Members" }));

    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-NEG-001 returns collapsed when the route changes", async () => {
    const { rerender } = render(
      createElement(DesktopAdminNavigation, { access }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Expand navigation" }),
    );
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();

    navigation.pathname = "/admin/hackathon";
    rerender(createElement(DesktopAdminNavigation, { access }));

    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-004 renders only authorized groups and marks Guild external", async () => {
    render(
      createElement(DesktopAdminNavigation, { access: { members: true } }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Expand navigation" }),
    );

    expect(screen.getByRole("group", { name: "Club" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "External" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Team" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Hackathon" })).toBeNull();

    const guild = screen.getByRole("link", {
      name: /Guild \(opens in a new tab\)/,
    });
    expect(guild).toHaveAttribute("target", "_blank");
    expect(guild).toHaveAttribute("rel", "noreferrer");
  });
});
