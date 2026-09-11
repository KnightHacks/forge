/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { ChallengeConfigurationPanel } from "~/app/_components/judging/challenge-configuration-panel";
import { JudgingConfigurationPanel } from "~/app/_components/judging/judging-configuration-panel";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  refresh: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("~/app/_components/shared/route-transition-link", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      projects: { invalidate: mocks.invalidate },
      judging: { listScheduleAdmin: { invalidate: mocks.invalidate } },
    }),
    judging: {
      saveRubric: { useMutation: () => ({ isPending: false }) },
      setJudgingState: { useMutation: () => ({ isPending: false }) },
      setDisplayAllResults: { useMutation: () => ({ isPending: false }) },
    },
    projects: {
      createGroup: {
        useMutation: () => ({
          mutateAsync: mocks.createGroup,
          isPending: false,
        }),
      },
      updateGroup: {
        useMutation: () => ({
          mutateAsync: mocks.updateGroup,
          isPending: false,
        }),
      },
      deleteGroup: {
        useMutation: () => ({
          mutateAsync: mocks.deleteGroup,
          isPending: false,
        }),
      },
      updateChallenge: {
        useMutation: () => ({ mutateAsync: mocks.update, isPending: false }),
      },
    },
  },
}));

const data = {
  hackathon: {
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "Knight Hacks",
    timezone: "America/New_York",
  },
  challenges: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      label: "General",
      parentId: null,
      isGeneral: true,
      isGroup: true,
      isMlhImportDefault: false,
      isScheduled: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      label: "First-time hacker",
      parentId: null,
      isGeneral: false,
      isGroup: false,
      isMlhImportDefault: false,
      isScheduled: true,
    },
  ],
  setupLocked: false,
  challengeSetupLocked: false,
  configuration: {
    closedAt: null,
    displayAllResults: false,
    judgingCommsChannelId: null,
    openedAt: null,
    state: "draft",
  },
  inventoryLockedAt: null,
  discordGuildId: null,
  globalAnnouncement: null,
  rubric: [],
  rooms: [],
} satisfies RouterOutputs["judging"]["listAdmin"];

describe("organizer challenge setup", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("explains the saved-schedule rubric lock without mislabeling open judging", () => {
    const view = render(
      <JudgingConfigurationPanel data={{ ...data, setupLocked: true }} />,
    );
    expect(
      screen.getByText(/A saved schedule locks the rubric/),
    ).toBeInTheDocument();
    view.rerender(
      <JudgingConfigurationPanel
        data={{
          ...data,
          setupLocked: true,
          configuration: { ...data.configuration, state: "open" },
        }}
      />,
    );
    expect(
      screen.getByText(/The rubric cannot change after judging opens/),
    ).toBeInTheDocument();
  });

  it("assigns an imported challenge to an editable group", async () => {
    const [general, firstTime] = data.challenges;
    if (!general || !firstTime) throw new Error("Missing challenge fixtures");
    const user = userEvent.setup();
    render(<ChallengeConfigurationPanel data={data} />);
    expect(screen.queryByLabelText("Tag color")).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Group name: General" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Create challenge" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Collapse First-time hacker into" }),
      general.id,
    );
    expect(mocks.update).toHaveBeenCalledWith({
      hackathonId: data.hackathon.id,
      challengeId: firstTime.id,
      parentId: general.id,
      isScheduled: true,
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("creates a named group with optional every-project membership", async () => {
    const user = userEvent.setup();
    render(<ChallengeConfigurationPanel data={data} />);
    expect(
      screen.queryByRole("textbox", { name: "New judging group" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add judging group" }));
    expect(screen.queryByLabelText("Tag color")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "New judging group" }),
      "Community awards",
    );
    await user.click(screen.getByRole("button", { name: "Create group" }));
    expect(mocks.createGroup).toHaveBeenCalledWith({
      hackathonId: data.hackathon.id,
      label: "Community awards",
      isMlhImportDefault: false,
      isGeneral: false,
      isScheduled: true,
    });
    expect(
      screen.queryByRole("textbox", { name: "New judging group" }),
    ).not.toBeInTheDocument();
  });

  it("keeps saved setup readable and prevents editing every setup control", () => {
    render(
      <ChallengeConfigurationPanel
        data={{ ...data, setupLocked: true, challengeSetupLocked: true }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Create challenge" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "New parent challenge" }),
    ).not.toBeInTheDocument();
    for (const control of [
      screen.getByRole("textbox", { name: "Group name: General" }),
      ...screen.getAllByRole("combobox"),
      ...screen.getAllByRole("checkbox"),
    ])
      expect(control).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Find a challenge" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Add judging group" }),
    ).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
