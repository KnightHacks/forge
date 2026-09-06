/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { EvaluationAuditPanel } from "~/app/_components/judging/evaluation-audit-panel";

const query = vi.hoisted(() => ({
  data: {
    evaluation: {
      challengeLabel: "General",
      hackathonId: "00000000-0000-4000-8000-000000000001",
      id: "00000000-0000-4000-8000-000000000002",
      judgeDisplayName: "Morgan Judge",
      projectTitle: "Signal Forge",
    },
    revisions: [
      {
        actorKind: "member" as const,
        createdAt: new Date("2026-09-05T14:00:00.000Z"),
        ratingAnswers: [
          {
            itemId: "00000000-0000-4000-8000-000000000004",
            value: 5,
          },
        ],
        responseAnswers: [
          {
            isPublic: true,
            itemId: "00000000-0000-4000-8000-000000000005",
            value: "Clear technical story",
          },
        ],
        revision: 2,
      },
    ],
    rubric: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        label: "Technical understanding",
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        label: "Feedback",
      },
    ],
  },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      getEvaluationRevisions: {
        useQuery: () => ({
          data: query.data,
          error: null,
          isLoading: false,
        }),
      },
    },
  },
}));

describe("officer evaluation history", () => {
  it("opens labeled revision snapshots from the evaluation list", async () => {
    const evaluations = [
      {
        challengeLabel: "General",
        id: "00000000-0000-4000-8000-000000000002",
        judgeDisplayName: "Morgan Judge",
        projectTitle: "Signal Forge",
        revision: 2,
        updatedAt: new Date("2026-09-05T14:00:00.000Z"),
      },
    ] satisfies RouterOutputs["judging"]["listEvaluationAudit"];
    const user = userEvent.setup();

    render(
      <EvaluationAuditPanel
        evaluations={evaluations}
        timeZone="America/New_York"
      />,
    );
    const viewHistory = screen.getAllByRole("button", {
      name: "View history",
    })[0];
    if (!viewHistory) throw new Error("Expected a history button.");
    await user.click(viewHistory);

    expect(
      screen.getByRole("dialog", { name: "Signal Forge" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Revision 2")).toHaveLength(2);
    expect(screen.getByText("Technical understanding")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("Clear technical story")).toBeInTheDocument();
    expect(screen.getByText("Shared with hackers")).toBeInTheDocument();
  });
});
