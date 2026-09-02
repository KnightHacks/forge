/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { ProjectDetailDialog } from "~/app/_components/projects/project-detail-dialog";
import { ProjectDirectory } from "~/app/_components/projects/project-directory";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/judge/projects",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

type JudgeProject = RouterOutputs["projects"]["listJudge"]["projects"][number];
type AdminProject = RouterOutputs["projects"]["listAdmin"]["projects"][number];

const sharedProject = {
  challenges: [{ id: "challenge-1", label: "General" }],
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
