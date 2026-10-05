/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IssueReportingSection } from "~/app/_components/admin/hackathon/issue-reporting-section";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
  error: false,
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      hackathon: { getIssueReporting: { invalidate: mocks.invalidate } },
    }),
    hackathon: {
      getIssueReporting: {
        useQuery: () => ({
          data: { issueReportsChannelId: null, issueReportsRoleId: null },
          isPending: false,
          isError: mocks.error,
          refetch: mocks.refetch,
        }),
      },
      updateIssueReporting: {
        useMutation: () => ({ isPending: false, mutate: mocks.mutate }),
      },
    },
  },
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("hackathon issue reporting settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.error = false;
  });
  it("lets officers configure a channel and role for this hackathon", async () => {
    const user = userEvent.setup();
    render(<IssueReportingSection hackathonId="event" />);
    const save = screen.getByRole("button", {
      name: "Save reporting settings",
    });
    expect(save).toBeDisabled();
    await user.type(
      screen.getByLabelText("Discord channel ID"),
      "234567890123456789",
    );
    await user.type(
      screen.getByLabelText("Role to ping (optional)"),
      "345678901234567890",
    );
    await user.click(save);
    expect(mocks.mutate).toHaveBeenCalledWith({
      hackathonId: "event",
      issueReportsChannelId: "234567890123456789",
      issueReportsRoleId: "345678901234567890",
    });
  });
  it("blocks invalid IDs and permits reports without a ping role", async () => {
    const user = userEvent.setup();
    render(<IssueReportingSection hackathonId="event" />);
    const channel = screen.getByLabelText("Discord channel ID");
    await user.type(channel, "bad-id");
    expect(
      screen.getByRole("button", { name: "Save reporting settings" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Discord ID");
    await user.clear(channel);
    await user.type(channel, "234567890123456789");
    await user.click(
      screen.getByRole("button", { name: "Save reporting settings" }),
    );
    expect(mocks.mutate).toHaveBeenCalledWith({
      hackathonId: "event",
      issueReportsChannelId: "234567890123456789",
      issueReportsRoleId: null,
    });
  });
  it("shows retry when the settings cannot be loaded", async () => {
    mocks.error = true;
    render(<IssueReportingSection hackathonId="event" />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
