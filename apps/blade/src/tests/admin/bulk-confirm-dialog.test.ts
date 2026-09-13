/** @vitest-environment jsdom */
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bulkActionCopy,
  BulkConfirmDialog,
  skipLabel,
} from "~/app/_components/admin/hackathon/hackers/bulk-confirm-dialog";

const mutations = vi.hoisted(() => ({
  confirmDelete: vi.fn(),
  confirmStatus: vi.fn(),
  previewDelete: vi.fn(),
  previewStatus: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    hacker: {
      confirmBulk: {
        useMutation: () => ({
          isPending: false,
          mutate: mutations.confirmStatus,
        }),
      },
      confirmBulkDelete: {
        useMutation: () => ({
          isPending: false,
          mutate: mutations.confirmDelete,
        }),
      },
      previewBulk: {
        useMutation: () => ({
          data: undefined,
          error: null,
          isPending: false,
          mutate: mutations.previewStatus,
          reset: vi.fn(),
        }),
      },
      previewBulkDelete: {
        useMutation: () => ({
          data: {
            deleting: [
              {
                attendeeId: "attendee-1",
                email: "hacker@example.test",
                name: "Test Hacker",
              },
            ],
            skipped: [],
          },
          error: null,
          isPending: false,
          mutate: mutations.previewDelete,
          reset: vi.fn(),
        }),
      },
    },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("bulk hacker deletion", () => {
  it("states that deletion is permanent and sends no email", () => {
    const copy = bulkActionCopy("delete", 3);

    expect(copy.confirm).toBe("Delete 3 applications");
    expect(copy.description).toMatch(/permanently.*No email is sent/);
    expect(copy.label).toBe("Will be permanently deleted");
  });

  it("routes delete preview and confirmation through delete-only mutations", async () => {
    const user = userEvent.setup();
    render(
      createElement(BulkConfirmDialog, {
        action: "delete",
        attendeeIds: ["attendee-1"],
        hackathonId: "hackathon-1",
        onDone: vi.fn(),
        onOpenChange: vi.fn(),
      }),
    );

    expect(mutations.previewDelete).toHaveBeenCalledWith({
      attendeeIds: ["attendee-1"],
      hackathonId: "hackathon-1",
    });
    expect(mutations.previewStatus).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Delete 1 applications" }),
    );
    expect(mutations.confirmDelete).toHaveBeenCalledWith({
      attendeeIds: ["attendee-1"],
      confirmed: true,
      hackathonId: "hackathon-1",
    });
    expect(mutations.confirmStatus).not.toHaveBeenCalled();
  });
});

describe("bulk hacker status skip labels", () => {
  it("explains that checked-in admission is permanent", () => {
    expect(skipLabel("checked_in")).toBe("Already checked into this hackathon");
  });

  it("keeps an old tab readable after an unknown reason ships", () => {
    expect(skipLabel("future_reason")).toBe("Skipped — reload for details");
  });
});
