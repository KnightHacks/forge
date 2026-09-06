/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { JudgeDeliberation } from "~/app/_components/judging/judge-deliberation";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  create: vi.fn(),
  deleteSection: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  reorderProjects: vi.fn(),
  reorderSections: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@forge/ui/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    disconnect() {
      return undefined;
    }
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
  },
);
Element.prototype.scrollIntoView = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      addDeliberationProject: {
        useMutation: () => ({ isPending: false, mutateAsync: mocks.add }),
      },
      createDeliberationSection: {
        useMutation: () => ({ isPending: false, mutateAsync: mocks.create }),
      },
      deleteDeliberationSection: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.deleteSection,
        }),
      },
      removeDeliberationProject: {
        useMutation: () => ({ isPending: false, mutateAsync: mocks.remove }),
      },
      renameDeliberationSection: {
        useMutation: () => ({ isPending: false, mutateAsync: mocks.rename }),
      },
      reorderDeliberationProjects: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.reorderProjects,
        }),
      },
      reorderDeliberationSections: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.reorderSections,
        }),
      },
    },
  },
}));

const hackathonId = "00000000-0000-4000-8000-000000000001";
const firstSectionId = "00000000-0000-4000-8000-000000000011";
const secondSectionId = "00000000-0000-4000-8000-000000000012";
const firstEntryId = "00000000-0000-4000-8000-000000000021";
const secondEntryId = "00000000-0000-4000-8000-000000000022";
const firstProjectId = "00000000-0000-4000-8000-000000000031";
const secondProjectId = "00000000-0000-4000-8000-000000000032";
const thirdProjectId = "00000000-0000-4000-8000-000000000033";

const sections = [
  {
    entries: [
      {
        available: true,
        id: firstEntryId,
        projectId: firstProjectId,
        sectionId: firstSectionId,
        title: "First project",
      },
      {
        available: true,
        id: secondEntryId,
        projectId: secondProjectId,
        sectionId: firstSectionId,
        title: "Second project",
      },
    ],
    id: firstSectionId,
    name: "Finalists",
  },
  { entries: [], id: secondSectionId, name: "Backups" },
] satisfies RouterOutputs["judging"]["listMyDeliberation"];

const submissions = [
  {
    challengeId: "00000000-0000-4000-8000-000000000041",
    challengeLabel: "General",
    createdAt: new Date("2026-09-05T12:00:00.000Z"),
    id: "00000000-0000-4000-8000-000000000051",
    projectAvailable: true,
    projectId: thirdProjectId,
    projectTitle: "Third project",
    ratings: [],
    responses: [],
    revision: 1,
    score: 4,
    updatedAt: new Date("2026-09-05T13:00:00.000Z"),
  },
] satisfies RouterOutputs["judging"]["listMySubmissions"];

function workspace(state: "closed" | "open") {
  return {
    challengeId: "00000000-0000-4000-8000-000000000041",
    displayAllResults: false,
    hackathonId,
    principalKind: "member" as const,
    rubric: [],
    state,
  };
}

describe("judge deliberation", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.add.mockResolvedValue({});
    mocks.create.mockResolvedValue({});
    mocks.deleteSection.mockResolvedValue({ deleted: true });
    mocks.remove.mockResolvedValue({ removed: true });
    mocks.rename.mockResolvedValue({});
    mocks.reorderProjects.mockResolvedValue({ reordered: true });
    mocks.reorderSections.mockResolvedValue({ reordered: true });
  });

  it("supports explicit project and section ordering with 44px controls", async () => {
    const user = userEvent.setup();
    render(
      <JudgeDeliberation
        initialSections={sections}
        submissions={submissions}
        workspace={workspace("open")}
      />,
    );

    const projectUp = screen.getByRole("button", {
      name: "Move Second project up",
    });
    const sectionUp = screen.getByRole("button", {
      name: "Move Backups section up",
    });
    expect(projectUp).toHaveClass("size-11");
    expect(sectionUp).toHaveClass("size-11");

    await user.click(projectUp);
    await waitFor(() =>
      expect(mocks.reorderProjects).toHaveBeenCalledWith({
        hackathonId,
        ids: [secondEntryId, firstEntryId],
        sectionId: firstSectionId,
      }),
    );
    await user.click(sectionUp);
    await waitFor(() =>
      expect(mocks.reorderSections).toHaveBeenCalledWith({
        hackathonId,
        ids: [secondSectionId, firstSectionId],
      }),
    );
  });

  it("wires section CRUD and judged-project actions", async () => {
    const user = userEvent.setup();
    render(
      <JudgeDeliberation
        initialSections={sections}
        submissions={submissions}
        workspace={workspace("open")}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "New deliberation section name" }),
      "Best demos",
    );
    await user.click(screen.getByRole("button", { name: "Create section" }));
    expect(mocks.create).toHaveBeenCalledWith({
      hackathonId,
      name: "Best demos",
    });

    const firstName = screen.getAllByRole("textbox", {
      name: "Section name",
    })[0];
    if (!firstName) throw new Error("Expected a section name input.");
    await user.clear(firstName);
    await user.type(firstName, "Top three");
    const saveName = screen.getAllByRole("button", { name: "Save name" })[0];
    if (!saveName) throw new Error("Expected a save-name button.");
    await user.click(saveName);
    expect(mocks.rename).toHaveBeenCalledWith({
      hackathonId,
      name: "Top three",
      sectionId: firstSectionId,
    });

    await user.click(
      screen.getByRole("combobox", {
        name: "Add a judged project to Finalists",
      }),
    );
    await user.type(
      screen.getByPlaceholderText("Search judged projects"),
      "Third",
    );
    await user.click(screen.getByRole("option", { name: "Third project" }));
    const addProject = screen.getAllByRole("button", {
      name: "Add project",
    })[0];
    if (!addProject) throw new Error("Expected an add-project button.");
    await user.click(addProject);
    expect(mocks.add).toHaveBeenCalledWith({
      hackathonId,
      projectId: thirdProjectId,
      sectionId: firstSectionId,
    });

    await user.click(
      screen.getByRole("button", {
        name: "Remove First project from section",
      }),
    );
    expect(mocks.remove).toHaveBeenCalledWith({
      hackathonId,
      projectId: firstProjectId,
      sectionId: firstSectionId,
    });

    await user.click(
      screen.getByRole("button", { name: "Delete Finalists section" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete section" }));
    expect(mocks.deleteSection).toHaveBeenCalledWith({
      hackathonId,
      sectionId: firstSectionId,
    });
  });

  it("disables every mutation while judging is closed", () => {
    render(
      <JudgeDeliberation
        initialSections={sections}
        submissions={submissions}
        workspace={workspace("closed")}
      />,
    );

    expect(
      screen.getByText(
        "Deliberation lists are read-only while judging is closed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create section" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reorder Finalists section" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Second project up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete Finalists section" }),
    ).toBeDisabled();
  });

  it("shows fresh server sections after a route refresh", () => {
    const { rerender } = render(
      <JudgeDeliberation
        initialSections={sections}
        submissions={submissions}
        workspace={workspace("open")}
      />,
    );

    rerender(
      <JudgeDeliberation
        initialSections={[
          ...sections,
          {
            entries: [],
            id: "00000000-0000-4000-8000-000000000013",
            name: "New server section",
          },
        ]}
        submissions={submissions}
        workspace={workspace("open")}
      />,
    );

    expect(screen.getByDisplayValue("New server section")).toBeInTheDocument();
  });
});
