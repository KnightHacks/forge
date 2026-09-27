/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { JudgingAnnouncements } from "~/app/_components/judging/judging-announcements";

type Announcement = RouterOutputs["judging"]["listAnnouncements"][number];

const query = vi.hoisted(() => ({
  data: undefined as Announcement[] | undefined,
  input: undefined as unknown,
  options: undefined as unknown,
}));

vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      listAnnouncements: {
        useQuery: (input: unknown, options: unknown) => {
          query.input = input;
          query.options = options;
          return { data: query.data };
        },
      },
    },
  },
}));

const standard = {
  id: "00000000-0000-4000-8000-000000000001",
  includeGuests: false,
  isUrgent: false,
  message: "Deliberation begins at 4:30 PM.",
  publishedAt: new Date("2026-09-05T20:00:00.000Z"),
  roomId: null,
  roomName: null,
} satisfies Announcement;

const urgent = {
  ...standard,
  id: "00000000-0000-4000-8000-000000000002",
  isUrgent: true,
  message: "Pause judging and wait for an organizer.",
  roomId: "00000000-0000-4000-8000-000000000003",
  roomName: "Sponsor suite A",
} satisfies Announcement;

describe("judging announcements", () => {
  beforeEach(() => {
    query.data = undefined;
    query.input = undefined;
    query.options = undefined;
    sessionStorage.clear();
  });

  it("renders a server-provided banner until the judge dismisses it", async () => {
    const user = userEvent.setup();
    render(<JudgingAnnouncements initialAnnouncements={[standard]} />);

    expect(screen.getByText(standard.message)).toBeInTheDocument();
    expect(screen.getByText("All judging rooms")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Dismiss announcement for All judging rooms",
      }),
    );
    expect(screen.queryByText(standard.message)).not.toBeInTheDocument();
  });

  it("keeps a dismissed announcement hidden after a remount", async () => {
    const user = userEvent.setup();
    const first = render(
      <JudgingAnnouncements initialAnnouncements={[standard]} />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Dismiss announcement for All judging rooms",
      }),
    );
    first.unmount();
    render(<JudgingAnnouncements initialAnnouncements={[standard]} />);

    expect(screen.queryByText(standard.message)).not.toBeInTheDocument();
  });

  it("keeps dismissals in memory when browser storage is unavailable", async () => {
    const user = userEvent.setup();
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage denied", "SecurityError");
      });
    render(<JudgingAnnouncements initialAnnouncements={[standard]} />);

    await user.click(
      screen.getByRole("button", {
        name: "Dismiss announcement for All judging rooms",
      }),
    );

    expect(screen.queryByText(standard.message)).not.toBeInTheDocument();
    setItem.mockRestore();
  });

  it("polls in the background and renders replacements and clears", async () => {
    const user = userEvent.setup();
    const replacement = {
      ...standard,
      id: "00000000-0000-4000-8000-000000000004",
      message: "Deliberation now begins at 4:45 PM.",
    } satisfies Announcement;
    const view = render(
      <JudgingAnnouncements
        hackathonId="00000000-0000-4000-8000-000000000005"
        initialAnnouncements={[standard]}
      />,
    );

    expect(query.input).toEqual({
      hackathonId: "00000000-0000-4000-8000-000000000005",
    });
    expect(query.options).toMatchObject({
      refetchInterval: 30_000,
      refetchIntervalInBackground: true,
    });
    await user.click(
      screen.getByRole("button", {
        name: "Dismiss announcement for All judging rooms",
      }),
    );
    query.data = [replacement];
    view.rerender(
      <JudgingAnnouncements
        hackathonId="00000000-0000-4000-8000-000000000005"
        initialAnnouncements={[standard]}
      />,
    );
    expect(screen.getByText(replacement.message)).toBeInTheDocument();

    query.data = [];
    view.rerender(
      <JudgingAnnouncements
        hackathonId="00000000-0000-4000-8000-000000000005"
        initialAnnouncements={[standard]}
      />,
    );
    expect(screen.queryByText(replacement.message)).not.toBeInTheDocument();
  });

  it("requires an explicit acknowledgement for an urgent notice", async () => {
    const user = userEvent.setup();
    render(<JudgingAnnouncements initialAnnouncements={[urgent]} />);

    expect(
      screen.getByRole("dialog", { name: "Urgent judging announcement" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sponsor suite A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("includes urgent announcement content in server HTML", () => {
    const html = renderToStaticMarkup(
      <JudgingAnnouncements initialAnnouncements={[urgent]} />,
    );

    expect(html).toContain("Urgent judging announcement");
    expect(html).toContain(urgent.message);
    expect(html).toContain("Sponsor suite A");
  });
});
