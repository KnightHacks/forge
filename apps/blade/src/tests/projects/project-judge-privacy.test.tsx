/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { EvaluationDialog } from "~/app/_components/judging/evaluation-dialog";
import { JudgeProjectWorkspace } from "~/app/_components/projects/judge-project-workspace";
import { ProjectDetailDialog } from "~/app/_components/projects/project-detail-dialog";
import { ProjectDirectory } from "~/app/_components/projects/project-directory";

const navigation = vi.hoisted(() => ({
  announcementData: [] as RouterOutputs["judging"]["listAnnouncements"],
  refresh: vi.fn(),
  replace: vi.fn(),
  setAnnouncements: vi.fn(),
  invalidateAnnouncements: vi.fn(() => Promise.resolve()),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  saveEvaluation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/judge/projects",
  useRouter: () => ({
    refresh: navigation.refresh,
    replace: navigation.replace,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      judging: {
        listAnnouncements: {
          invalidate: navigation.invalidateAnnouncements,
          setData: navigation.setAnnouncements,
        },
      },
    }),
    judging: {
      heartbeat: {
        useMutation: () => ({ mutate: vi.fn() }),
      },
      joinRoom: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: navigation.joinRoom,
        }),
      },
      leaveRoom: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: navigation.leaveRoom,
        }),
      },
      listAnnouncements: {
        useQuery: () => ({ data: navigation.announcementData }),
      },
      getProjectJudgingDetails: {
        useQuery: () => ({ data: undefined, error: null, isLoading: false }),
      },
      saveEvaluation: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: navigation.saveEvaluation,
        }),
      },
    },
  },
}));

type JudgeProject = RouterOutputs["projects"]["listJudge"]["projects"][number];
type AdminProject = RouterOutputs["projects"]["listAdmin"]["projects"][number];

const sharedProject = {
  challenges: [{ evaluationCount: 1, id: "challenge-1", label: "General" }],
  createdAt: new Date("2026-08-01T12:00:00.000Z"),
  deletedAt: null,
  deletedByUserId: null,
  demoLinks: ["https://signal.example.test"],
  description: "A private-by-default judging project.",
  hackathonId: "00000000-0000-4000-8000-000000000527",
  id: "00000000-0000-4000-8000-000000000001",
  participantCount: 1,
  prizeCategories: [],
  projectCreatedAt: new Date("2026-07-31T12:00:00.000Z"),
  submissionUrl: "https://devpost.com/software/signal-forge",
  submittedAt: new Date("2026-08-01T11:00:00.000Z"),
  technologies: ["TypeScript"],
  title: "Signal Forge",
  updatedAt: new Date("2026-08-01T12:00:00.000Z"),
  videoUrl: null,
};

const judgeProject = {
  ...sharedProject,
  members: [{ name: "Casey Captain" }],
} satisfies JudgeProject;

const adminProject = {
  ...sharedProject,
  members: [
    {
      email: "captain@example.test",
      id: "00000000-0000-4000-8000-000000000002",
      name: "Casey Captain",
      order: 0,
    },
  ],
  universities: ["University of Central Florida"],
} satisfies AdminProject;

describe("judge project privacy", () => {
  it("shows names without participant emails or schools", () => {
    render(
      <ProjectDetailDialog onOpenChange={vi.fn()} project={judgeProject} />,
    );

    expect(screen.getByText("Casey Captain")).toBeInTheDocument();
    expect(screen.queryByText("captain@example.test")).not.toBeInTheDocument();
    expect(
      screen.queryByText("University of Central Florida"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Schools")).not.toBeInTheDocument();
  });

  it("keeps participant emails and schools on the admin detail view", () => {
    render(
      <ProjectDetailDialog
        onOpenChange={vi.fn()}
        project={adminProject}
        showPrivateDetails
      />,
    );

    expect(screen.getByText("captain@example.test")).toBeInTheDocument();
    expect(
      screen.getByText("University of Central Florida"),
    ).toBeInTheDocument();
  });

  it("contains wide descriptions, hides images, and lets judges expand long copy", async () => {
    const user = userEvent.setup();
    const description = [
      "Long project description. ".repeat(40),
      "![Broken diagram](https://example.test/missing.png)",
      `\`\`\`\n${"wide-table-cell ".repeat(30)}\n\`\`\``,
    ].join("\n\n");
    render(
      <ProjectDetailDialog
        onOpenChange={vi.fn()}
        project={{ ...judgeProject, description }}
      />,
    );

    expect(screen.queryByRole("img", { name: "Broken diagram" })).toBeNull();
    const codeBlock = document.querySelector("pre");
    expect(codeBlock?.parentElement).toHaveClass("[&_pre]:overflow-x-auto");

    const expand = screen.getByRole("button", {
      name: "Show full description",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await user.click(expand);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

describe("judge project directory", () => {
  it("uses judge-specific filters and project count copy", () => {
    render(
      <JudgeProjectWorkspace
        data={{
          challenges: judgeProject.challenges,
          hackathon: {
            displayName: "Knight Hacks IX",
            endDate: new Date("2026-10-01T00:00:00.000Z"),
            id: judgeProject.hackathonId,
            startDate: new Date("2026-09-01T00:00:00.000Z"),
          },
          page: 1,
          pageSize: 25,
          projects: [judgeProject],
          totalCount: 1,
        }}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        workspace={{
          challengeId: "challenge-1",
          displayAllResults: false,
          hackathonId: judgeProject.hackathonId,
          principalKind: "member",
          rubric: [],
          state: "draft",
        }}
      />,
    );

    expect(screen.getByText("1 project")).toBeInTheDocument();
    expect(screen.queryByText(/imported project/i)).toBeNull();
    expect(
      screen.queryByRole("spinbutton", { name: "Minimum team size" }),
    ).toBeNull();
    expect(
      screen.queryByRole("spinbutton", { name: "Maximum team size" }),
    ).toBeNull();
    expect(screen.getAllByText("Casey Captain").length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "General" })).toBeInTheDocument();
  });

  it("shows a fixed room challenge instead of a guest challenge selector", () => {
    render(
      <ProjectDirectory
        data={{
          challenges: [{ id: "challenge-acme", label: "Acme Challenge" }],
          page: 1,
          pageSize: 10,
          projects: [
            {
              ...judgeProject,
              challenges: [
                {
                  evaluationCount: 0,
                  id: "challenge-acme",
                  label: "Acme Challenge",
                },
              ],
            },
          ],
          totalCount: 1,
        }}
        input={{
          challengeIds: ["challenge-acme"],
          direction: "asc",
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
        lockedChallenge={{ id: "challenge-acme", label: "Acme Challenge" }}
        showChallenges={false}
      />,
    );

    expect(screen.getByText("Room scope")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Challenge" })).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "Challenges" }),
    ).toBeNull();
  });

  it("refreshes announcement scope after joining and leaving a room", async () => {
    const user = userEvent.setup();
    navigation.setAnnouncements.mockClear();
    navigation.invalidateAnnouncements.mockClear();
    navigation.joinRoom.mockResolvedValue({
      challengeId: "challenge-acme",
      discordDelivery: "not_configured",
    });
    navigation.leaveRoom.mockResolvedValue({ left: true });
    const data = {
      challenges: judgeProject.challenges,
      hackathon: {
        displayName: "Knight Hacks IX",
        endDate: new Date("2026-10-01T00:00:00.000Z"),
        id: judgeProject.hackathonId,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      page: 1,
      pageSize: 25,
      projects: [judgeProject],
      totalCount: 1,
    };
    const room = {
      challengeId: "challenge-acme",
      challengeLabel: "Acme Challenge",
      id: "00000000-0000-4000-8000-000000000006",
      name: "Sponsor suite A",
    };
    const context = {
      activeRoomId: null,
      announcements: [],
      discordUserId: "123456789012345678",
      displayName: "Morgan Judge",
      hackathon: data.hackathon,
      isOfficer: false,
      kind: "member" as const,
      rooms: [room],
      userId: "00000000-0000-4000-8000-000000000007",
    };
    const view = render(
      <JudgeProjectWorkspace
        data={data}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        judgingContext={context}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Judging room" }),
      room.id,
    );
    await waitFor(() =>
      expect(navigation.invalidateAnnouncements).toHaveBeenCalledTimes(1),
    );
    expect(navigation.setAnnouncements).toHaveBeenLastCalledWith(
      { hackathonId: data.hackathon.id },
      [],
    );

    view.rerender(
      <JudgeProjectWorkspace
        data={data}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        judgingContext={{ ...context, activeRoomId: room.id }}
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Judging room" }),
      "",
    );
    await waitFor(() =>
      expect(navigation.invalidateAnnouncements).toHaveBeenCalledTimes(2),
    );
    expect(navigation.setAnnouncements).toHaveBeenCalledTimes(2);
  });

  it("clears the previous room announcement when its refetch fails", async () => {
    const user = userEvent.setup();
    navigation.replace.mockClear();
    const oldRoomAnnouncement = {
      id: "00000000-0000-4000-8000-000000000008",
      includeGuests: false,
      isUrgent: false,
      message: "Private instructions for the previous room.",
      publishedAt: new Date("2026-09-06T14:00:00.000Z"),
      roomId: "00000000-0000-4000-8000-000000000009",
      roomName: "Previous room",
    } satisfies RouterOutputs["judging"]["listAnnouncements"][number];
    navigation.announcementData = [oldRoomAnnouncement];
    navigation.setAnnouncements.mockImplementation((_input, value) => {
      navigation.announcementData = value as typeof navigation.announcementData;
    });
    navigation.invalidateAnnouncements.mockRejectedValueOnce(
      new Error("Refetch failed"),
    );
    navigation.joinRoom.mockResolvedValue({
      challengeId: "challenge-acme",
      discordDelivery: "not_configured",
    });
    const data = {
      challenges: judgeProject.challenges,
      hackathon: {
        displayName: "Knight Hacks IX",
        endDate: new Date("2026-10-01T00:00:00.000Z"),
        id: judgeProject.hackathonId,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      page: 1,
      pageSize: 25,
      projects: [judgeProject],
      totalCount: 1,
    };
    const nextRoom = {
      challengeId: "challenge-acme",
      challengeLabel: "Acme Challenge",
      id: "00000000-0000-4000-8000-000000000006",
      name: "Sponsor suite A",
    };
    const context = {
      activeRoomId: oldRoomAnnouncement.roomId,
      announcements: [oldRoomAnnouncement],
      discordUserId: "123456789012345678",
      displayName: "Morgan Judge",
      hackathon: data.hackathon,
      isOfficer: false,
      kind: "member" as const,
      rooms: [nextRoom],
      userId: "00000000-0000-4000-8000-000000000007",
    };
    const view = render(
      <JudgeProjectWorkspace
        data={data}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        judgingContext={context}
      />,
    );

    expect(screen.getByText(oldRoomAnnouncement.message)).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Judging room" }),
      nextRoom.id,
    );
    await waitFor(() =>
      expect(navigation.setAnnouncements).toHaveBeenCalledWith(
        { hackathonId: data.hackathon.id },
        [],
      ),
    );
    view.rerender(
      <JudgeProjectWorkspace
        data={data}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        judgingContext={context}
      />,
    );

    expect(
      screen.queryByText(oldRoomAnnouncement.message),
    ).not.toBeInTheDocument();
    expect(navigation.replace).toHaveBeenCalledWith(
      "/judge/projects?challenge=challenge-acme",
    );
  });

  it("renders member score controls and challenge completion", async () => {
    navigation.replace.mockClear();
    const user = userEvent.setup();
    render(
      <JudgeProjectWorkspace
        data={{
          challenges: judgeProject.challenges,
          hackathon: {
            displayName: "Knight Hacks IX",
            endDate: new Date("2026-10-01T00:00:00.000Z"),
            id: judgeProject.hackathonId,
            startDate: new Date("2026-09-01T00:00:00.000Z"),
          },
          page: 1,
          pageSize: 25,
          projects: [judgeProject],
          totalCount: 1,
        }}
        hackathons={[]}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 25,
          query: "",
          sort: "title",
        }}
        isOfficer={false}
        scores={[
          {
            hasOwnEvaluation: true,
            overall: { count: 3, value: 4 },
            projectId: judgeProject.id,
            scoped: { count: 2, value: 4.5 },
          },
        ]}
        workspace={{
          challengeId: "challenge-1",
          displayAllResults: false,
          hackathonId: judgeProject.hackathonId,
          principalKind: "member",
          rubric: [],
          state: "open",
        }}
      />,
    );

    expect(screen.getByRole("tab", { name: "Projects" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Submissions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Deliberation" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Challenge rating").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rating").length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "Rating" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Challenge rating" }),
    ).toBeNull();
    expect(screen.getAllByTitle("1 evaluation")[0]).toBeInTheDocument();
    const includeJudged = screen.getByRole("switch", {
      name: "See previously judged projects",
    });
    expect(includeJudged).not.toBeChecked();
    await user.click(includeJudged);
    expect(navigation.replace).toHaveBeenCalledWith(
      "/judge/projects?includeJudged=1&page=1",
    );
    expect(
      screen.getAllByRole("button", {
        name: /view judge feedback for Signal Forge/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Judge" }).length).toBe(2);
  });

  it("opens project details from the eye button", async () => {
    const user = userEvent.setup();
    render(
      <ProjectDirectory
        data={{
          challenges: judgeProject.challenges,
          page: 1,
          pageSize: 10,
          projects: [judgeProject],
          totalCount: 1,
        }}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
        showViewAction
      />,
    );

    const [viewButton] = screen.getAllByRole("button", {
      name: "View Signal Forge",
    });
    expect(viewButton).toBeDefined();
    if (!viewButton)
      throw new Error("The project eye button was not rendered.");
    await user.click(viewButton);

    expect(
      screen.getByRole("dialog", { name: "Signal Forge" }),
    ).toBeInTheDocument();
  });
});

describe("evaluation feedback visibility", () => {
  it("makes authenticated feedback sharing explicit and fixed", () => {
    render(
      <EvaluationDialog
        challengeLabel="General"
        onOpenChange={vi.fn()}
        open
        project={{ id: judgeProject.id, title: judgeProject.title }}
        workspace={{
          challengeId: "challenge-1",
          displayAllResults: false,
          hackathonId: judgeProject.hackathonId,
          principalKind: "member",
          rubric: [
            {
              description: "Give the team useful feedback.",
              guestVisibilityPolicy: "public_optional",
              id: "00000000-0000-4000-8000-000000000012",
              kind: "short_response",
              label: "Feedback",
              memberVisibilityPolicy: "public",
              required: false,
            },
          ],
          state: "open",
        }}
      />,
    );

    expect(
      screen.getByText("Your feedback is shared with hackers"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Shared with hackers").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole("checkbox", {
        name: "Share this response with this project's hackers",
      }),
    ).toBeNull();
  });

  it("explains optional guest sharing before submission", () => {
    render(
      <EvaluationDialog
        challengeLabel="Acme Challenge"
        onOpenChange={vi.fn()}
        open
        project={{ id: judgeProject.id, title: judgeProject.title }}
        workspace={{
          challengeId: "challenge-1",
          displayAllResults: false,
          hackathonId: judgeProject.hackathonId,
          principalKind: "guest",
          rubric: [
            {
              description: "Assess the project.",
              guestVisibilityPolicy: null,
              id: "00000000-0000-4000-8000-000000000011",
              kind: "rating",
              label: "Technical understanding",
              memberVisibilityPolicy: null,
              required: true,
            },
            {
              description: "Leave a note.",
              guestVisibilityPolicy: "public_optional",
              id: "00000000-0000-4000-8000-000000000012",
              kind: "short_response",
              label: "Feedback",
              memberVisibilityPolicy: "public",
              required: false,
            },
          ],
          state: "open",
        }}
      />,
    );

    expect(
      screen.getByText("Choose what will be shared with hackers"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Not shared with hackers")[0],
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Share this response with this project's hackers",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("radiogroup", { name: "Technical understanding" }),
    ).toBeInTheDocument();
  });

  it("prefills and edits a saved guest evaluation", async () => {
    navigation.refresh.mockClear();
    navigation.saveEvaluation.mockReset().mockResolvedValue({
      evaluationId: "00000000-0000-4000-8000-000000000021",
      revision: 3,
      score: 5,
    });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const ratingId = "00000000-0000-4000-8000-000000000011";
    const responseId = "00000000-0000-4000-8000-000000000012";
    const workspace = {
      challengeId: "00000000-0000-4000-8000-000000000031",
      displayAllResults: false,
      hackathonId: judgeProject.hackathonId,
      principalKind: "guest" as const,
      rubric: [
        {
          description: "Assess the project.",
          guestVisibilityPolicy: null,
          id: ratingId,
          kind: "rating" as const,
          label: "Technical understanding",
          memberVisibilityPolicy: null,
          required: true,
        },
        {
          description: "Leave a note.",
          guestVisibilityPolicy: "public_optional" as const,
          id: responseId,
          kind: "short_response" as const,
          label: "Feedback",
          memberVisibilityPolicy: "public" as const,
          required: false,
        },
      ],
      state: "open" as const,
    };
    const submission = {
      challengeId: workspace.challengeId,
      challengeLabel: "Acme Challenge",
      createdAt: new Date("2026-09-05T12:00:00.000Z"),
      id: "00000000-0000-4000-8000-000000000021",
      projectAvailable: true,
      projectId: judgeProject.id,
      projectTitle: judgeProject.title,
      ratings: [
        {
          evaluationId: "00000000-0000-4000-8000-000000000021",
          itemId: ratingId,
          label: "Technical understanding",
          value: 4,
        },
      ],
      responses: [
        {
          evaluationId: "00000000-0000-4000-8000-000000000021",
          isPublic: true,
          itemId: responseId,
          label: "Feedback",
          value: "Promising first pass",
        },
      ],
      revision: 2,
      score: 4,
      updatedAt: new Date("2026-09-05T13:00:00.000Z"),
    } satisfies RouterOutputs["judging"]["listMySubmissions"][number];

    render(
      <EvaluationDialog
        challengeLabel="Acme Challenge"
        onOpenChange={onOpenChange}
        open
        project={{ id: judgeProject.id, title: judgeProject.title }}
        submission={submission}
        workspace={workspace}
      />,
    );

    expect(screen.getByRole("radio", { name: "4" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Feedback" })).toHaveValue(
      "Promising first pass",
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Share this response with this project's hackers",
      }),
    ).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "5" }));
    const response = screen.getByRole("textbox", { name: "Feedback" });
    await user.clear(response);
    await user.type(response, "Ready for finals");
    await user.click(screen.getByRole("button", { name: "Update submission" }));

    await waitFor(() =>
      expect(navigation.saveEvaluation).toHaveBeenCalledWith({
        challengeId: workspace.challengeId,
        hackathonId: workspace.hackathonId,
        projectId: judgeProject.id,
        ratings: [{ itemId: ratingId, value: 5 }],
        responses: [
          { isPublic: true, itemId: responseId, value: "Ready for finals" },
        ],
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("keeps a closed evaluation read-only", () => {
    render(
      <EvaluationDialog
        challengeLabel="General"
        onOpenChange={vi.fn()}
        open
        project={{ id: judgeProject.id, title: judgeProject.title }}
        workspace={{
          challengeId: "challenge-1",
          displayAllResults: false,
          hackathonId: judgeProject.hackathonId,
          principalKind: "member",
          rubric: [],
          state: "closed",
        }}
      />,
    );

    expect(screen.getByText("Judging is closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit score" })).toBeDisabled();
  });
});

describe("project team-size filters", () => {
  it("submits team-size bounds with the search query", async () => {
    navigation.replace.mockClear();
    const user = userEvent.setup();
    render(
      <ProjectDirectory
        data={{
          challenges: judgeProject.challenges,
          page: 1,
          pageSize: 10,
          projects: [judgeProject],
          totalCount: 1,
        }}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
      />,
    );

    await user.type(
      screen.getByRole("spinbutton", { name: "Minimum team size" }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "/judge/projects?minParticipants=3&page=1",
    );
  });

  it("clears an inverted maximum before applying team-size bounds", async () => {
    navigation.replace.mockClear();
    const user = userEvent.setup();
    render(
      <ProjectDirectory
        data={{
          challenges: judgeProject.challenges,
          page: 1,
          pageSize: 10,
          projects: [judgeProject],
          totalCount: 1,
        }}
        input={{
          challengeIds: [],
          direction: "asc",
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
      />,
    );

    await user.type(
      screen.getByRole("spinbutton", { name: "Minimum team size" }),
      "5",
    );
    const maximum = screen.getByRole("spinbutton", {
      name: "Maximum team size",
    });
    await user.type(maximum, "2");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(maximum).toHaveValue(null);
    expect(navigation.replace).toHaveBeenCalledWith(
      "/judge/projects?minParticipants=5&page=1",
    );
  });

  it("updates team-size fields when navigation changes the applied filters", async () => {
    const data = {
      challenges: judgeProject.challenges,
      page: 1,
      pageSize: 10,
      projects: [judgeProject],
      totalCount: 1,
    };
    const { rerender } = render(
      <ProjectDirectory
        data={data}
        input={{
          challengeIds: [],
          direction: "asc",
          maxParticipants: 4,
          minParticipants: 2,
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
      />,
    );

    rerender(
      <ProjectDirectory
        data={data}
        input={{
          challengeIds: [],
          direction: "asc",
          maxParticipants: 8,
          minParticipants: 6,
          page: 1,
          pageSize: 10,
          query: "",
          sort: "title",
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", { name: "Minimum team size" }),
      ).toHaveValue(6);
      expect(
        screen.getByRole("spinbutton", { name: "Maximum team size" }),
      ).toHaveValue(8);
    });
  });
});
