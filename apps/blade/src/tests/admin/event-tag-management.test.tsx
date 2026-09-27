/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventTagManagement } from "~/app/_components/admin/events/event-tag-management";

vi.stubGlobal("matchMedia", (media: string) => ({
  addEventListener: () => undefined,
  matches: true,
  media,
  removeEventListener: () => undefined,
}));

// Radix measures its checkbox; jsdom provides no layout observer.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  },
);

const tag = {
  active: true,
  announcementChannelId: "990000000000000950",
  color: "#7c3aed",
  defaultPoints: 10,
  emoji: "🛠️",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Workshop",
  skipNextWeek: true,
};

// A failed channel lookup must not silently reset a saved routing override.
describe("event tag settings preserve saved configuration", () => {
  it.each(["loading", "failed", "missing"])(
    "keeps the configured channel when its choices are %s",
    async (state) => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      const retry = vi.fn();
      render(
        <EventTagManagement
          channelsError={
            state === "failed" ? "Could not load channels." : undefined
          }
          channelsLoading={state === "loading"}
          onRetryChannels={retry}
          onUpdate={onUpdate}
          tags={[tag]}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Edit Workshop" }));
      expect(
        screen.getByRole("combobox", {
          name: "Announcement channel override (optional)",
        }),
      ).toHaveTextContent(tag.announcementChannelId);
      if (state === "failed") {
        await user.click(
          screen.getByRole("button", { name: "Retry channels" }),
        );
        expect(retry).toHaveBeenCalledOnce();
      }
      await user.clear(screen.getByLabelText("Default points"));
      await user.type(screen.getByLabelText("Default points"), "15");
      await user.click(screen.getByRole("button", { name: "Save tag" }));

      expect(onUpdate).toHaveBeenCalledWith(tag.id, {
        announcementChannelId: tag.announcementChannelId,
        color: tag.color,
        defaultPoints: 15,
        emoji: tag.emoji,
        name: tag.name,
        skipNextWeek: true,
      });
    },
  );

  it("retains unsaved edits after a rejected update", async () => {
    const user = userEvent.setup();
    render(
      <EventTagManagement
        onUpdate={() =>
          Promise.reject(new Error("Choose an available channel."))
        }
        tags={[tag]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Workshop" }));
    await user.clear(screen.getByLabelText("Announcement emoji"));
    await user.type(screen.getByLabelText("Announcement emoji"), "🚀");
    await user.click(screen.getByRole("button", { name: "Save tag" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose an available channel.",
    );
    expect(screen.getByLabelText("Announcement emoji")).toHaveValue("🚀");
    expect(
      screen.getByRole("combobox", {
        name: "Announcement channel override (optional)",
      }),
    ).toHaveTextContent(tag.announcementChannelId);
  });

  it("does not send the Club-only skip setting to hackathon mutations", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <EventTagManagement
        onUpdate={onUpdate}
        showSkipNextWeek={false}
        tags={[tag]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Workshop" }));
    expect(
      screen.queryByRole("checkbox", { name: "Skip Next Week reminders" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save tag" }));

    expect(onUpdate).toHaveBeenCalledWith(tag.id, {
      announcementChannelId: tag.announcementChannelId,
      color: tag.color,
      defaultPoints: tag.defaultPoints,
      emoji: tag.emoji,
      name: tag.name,
    });
  });
});
