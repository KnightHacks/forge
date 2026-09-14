/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HackerDetailDialog } from "~/app/_components/admin/hackathon/hackers/hacker-detail-dialog";

const fixture = vi.hoisted(() => ({
  data: {
    attendeeId: "test-attendee",
    firstName: "Test",
    lastName: "Hacker",
    name: "Test Hacker",
    status: "pending",
    age: 20,
    dob: "2006-01-01",
    gradDate: "2030-05-01",
    timeApplied: "2026-09-01",
    survey1: "",
    survey2: "",
  },
  deleteApplication: vi.fn(),
}));

vi.mock("@forge/ui/dialog", () => {
  const Container = ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>;
  return {
    Dialog: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});
vi.mock(
  "~/app/_components/admin/hackathon/hackers/hacker-event-attendance-panel",
  () => ({ HackerEventAttendancePanel: () => null }),
);
vi.mock("~/trpc/react", () => {
  const mutation = {
    useMutation: () => ({ isPending: false, mutate: vi.fn() }),
  };
  return {
    api: {
      hacker: {
        get: { useQuery: () => ({ data: fixture.data }) },
        deleteApplication: {
          useMutation: () => ({
            isPending: false,
            mutate: fixture.deleteApplication,
          }),
        },
        setStatus: mutation,
        setBlacklist: mutation,
        awardPoints: mutation,
        updateProfile: mutation,
      },
    },
  };
});

beforeEach(() => vi.clearAllMocks());

function renderDetail(canEdit = false) {
  return renderToStaticMarkup(
    <HackerDetailDialog
      canEdit={canEdit}
      isOfficer={false}
      attendeeId="test-attendee"
      blocked={false}
      blockedReason={null}
      hackathonId="test-hackathon"
      onOpenChange={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
}

describe("Hacker application responses", () => {
  it("shows both complete written answers with paragraph breaks as plain text", () => {
    fixture.data.survey1 = "First paragraph.\n\nSecond paragraph.";
    fixture.data.survey2 =
      "<script>alert('text only')</script>" + "longword".repeat(100);
    const html = renderDetail();
    expect(html).toContain("Application responses");
    expect(html).toContain("Why do you want to attend?");
    expect(html).toContain("What do you hope to achieve?");
    expect(html).toContain(fixture.data.survey1);
    expect(html).toContain("longword".repeat(100));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("explains missing and whitespace-only answers", () => {
    fixture.data.survey1 = "";
    fixture.data.survey2 = " \n ";
    expect(renderDetail().match(/No response provided\./g)).toHaveLength(2);
  });
});

describe("Hacker application deletion", () => {
  it("keeps the individual delete action in the editable detail view", () => {
    const html = renderDetail(true);
    expect(html).toContain("Delete application");
    expect(html).toContain("permanently deletes this application");
  });

  it("requires confirmation and deletes the selected attendee", async () => {
    const user = userEvent.setup();
    render(
      <HackerDetailDialog
        canEdit
        isOfficer={false}
        attendeeId="test-attendee"
        blocked={false}
        blockedReason={null}
        hackathonId="test-hackathon"
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const confirm = screen.getAllByRole("button", {
      name: "Delete application",
    })[1];
    if (!confirm) throw new Error("Delete confirmation was not rendered");
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /I understand this permanently deletes this application/,
      }),
    );
    await user.click(confirm);

    expect(fixture.deleteApplication).toHaveBeenCalledWith({
      attendeeId: "test-attendee",
      confirmed: true,
    });
  });
});
