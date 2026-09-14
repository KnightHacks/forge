/** @vitest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, test, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { JudgingResetPanel } from "~/app/_components/judging/judging-reset-panel";

const mutations = vi.hoisted(() => ({
  dropEvaluations: vi.fn().mockResolvedValue({}),
  dropRooms: vi.fn().mockResolvedValue({}),
  dropSchedule: vi.fn().mockResolvedValue({}),
  refresh: vi.fn(),
  resetHackathon: vi.fn().mockResolvedValue({}),
  resetLaunch: vi.fn().mockResolvedValue({}),
  resetProjects: vi.fn().mockResolvedValue({}),
  resetSetup: vi.fn().mockResolvedValue({}),
}));
const invalidations = vi.hoisted(() => ({
  listAdmin: vi.fn().mockResolvedValue(undefined),
  listScheduleAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/app/_components/shared/route-transition-link", () => ({
  useNavigationRouter: () => ({ refresh: mutations.refresh }),
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      judging: {
        listAdmin: { invalidate: invalidations.listAdmin },
        listScheduleAdmin: { invalidate: invalidations.listScheduleAdmin },
      },
    }),
    judging: {
      dropEvaluations: {
        useMutation: () => mutation(mutations.dropEvaluations),
      },
      dropRooms: { useMutation: () => mutation(mutations.dropRooms) },
      dropSchedule: { useMutation: () => mutation(mutations.dropSchedule) },
      resetHackathon: {
        useMutation: () => mutation(mutations.resetHackathon),
      },
      resetLaunch: { useMutation: () => mutation(mutations.resetLaunch) },
      resetProjects: { useMutation: () => mutation(mutations.resetProjects) },
      resetSetup: { useMutation: () => mutation(mutations.resetSetup) },
    },
  },
}));

function mutation(mutateAsync: ReturnType<typeof vi.fn>) {
  return { isPending: false, mutateAsync };
}

type ControlData = RouterOutputs["judging"]["listAdmin"];

const data = {
  challengeSetupLocked: false,
  challenges: [],
  configuration: {
    closedAt: null,
    displayAllResults: false,
    hackerSchedulePublished: false,
    judgingCommsChannelId: null,
    openedAt: null,
    state: "draft",
  },
  discordGuildId: null,
  globalAnnouncement: {
    id: "announcement-1",
    includeGuests: false,
    isUrgent: false,
    message: "Testing",
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    roomId: null,
  },
  hackathon: {
    displayName: "Knight Hacks",
    id: "hackathon-1",
    timezone: "America/New_York",
  },
  hasEvaluationData: true,
  hasSavedSchedule: false,
  hasScheduleData: true,
  inventory: { claimLinksSent: false, memberCount: 0, projectCount: 0 },
  inventoryLockedAt: null,
  rooms: [],
  rubric: [],
  scheduleDropLocked: false,
  setupLocked: false,
} satisfies ControlData;

const cases = [
  ["Projects", "Reset projects", mutations.resetProjects],
  [
    "Challenge and rubric setup",
    "Reset challenge and rubric setup",
    mutations.resetSetup,
  ],
  ["Rooms and access", "Drop rooms and access", mutations.dropRooms],
  ["Schedule", "Reset schedule", mutations.dropSchedule],
  ["Evaluations", "Drop evaluations", mutations.dropEvaluations],
  ["Launch settings", "Reset launch settings", mutations.resetLaunch],
] as const;

beforeEach(() => vi.clearAllMocks());

function granularResetButton(label: string) {
  const heading = screen.getByRole("heading", { name: label });
  const card = heading.parentElement?.parentElement;
  if (!card) throw new Error(`Reset card for ${label} was not rendered`);
  return within(card).getByRole("button", { name: "Reset" });
}

async function confirmReset(button: HTMLElement, confirmLabel: string) {
  const user = userEvent.setup();
  await user.click(button);
  await user.type(
    screen.getByRole("textbox", { name: "Hackathon name" }),
    "Knight Hacks",
  );
  await user.click(screen.getByRole("button", { name: confirmLabel }));
}

describe("judging reset actions", () => {
  test.each(cases)(
    "%s routes to its dedicated mutation",
    async (label, confirmLabel, expectedMutation) => {
      render(<JudgingResetPanel data={data} />);

      await confirmReset(granularResetButton(label), confirmLabel);

      expect(expectedMutation).toHaveBeenCalledWith(
        label === "Schedule"
          ? { hackathonId: "hackathon-1" }
          : { confirmation: "Knight Hacks", hackathonId: "hackathon-1" },
      );
      expect(
        Object.values(mutations)
          .filter((candidate) => candidate !== mutations.refresh)
          .reduce((total, candidate) => total + candidate.mock.calls.length, 0),
      ).toBe(1);
      expect(invalidations.listAdmin).toHaveBeenCalledWith({
        hackathonId: "hackathon-1",
      });
      expect(invalidations.listScheduleAdmin).toHaveBeenCalledWith({
        hackathonId: "hackathon-1",
      });
    },
  );

  it("routes the full reset to resetHackathon", async () => {
    render(<JudgingResetPanel data={data} />);

    await confirmReset(
      screen.getByRole("button", { name: "Reset all judging" }),
      "Reset all judging",
    );

    expect(mutations.resetHackathon).toHaveBeenCalledWith({
      confirmation: "Knight Hacks",
      hackathonId: "hackathon-1",
    });
  });

  it("offers job-only schedule cleanup but disables a locked schedule", () => {
    const view = render(<JudgingResetPanel data={data} />);
    expect(granularResetButton("Schedule")).toBeEnabled();

    view.rerender(
      <JudgingResetPanel data={{ ...data, scheduleDropLocked: true }} />,
    );
    expect(granularResetButton("Schedule")).toBeDisabled();
  });
});
