/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { createElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { RoleDetailDialog } from "~/app/_components/admin/roles/role-detail-dialog";

// `vi.mock` factories are hoisted above the module body, so the spies they
// close over have to be created with `vi.hoisted`.
const { feedbackMutate } = vi.hoisted(() => ({ feedbackMutate: vi.fn() }));

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);
  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

vi.mock("~/trpc/react", () => ({
  api: {
    roles: {
      listReminderChannels: {
        useQuery: vi.fn(() => ({
          data: [{ id: "1459204271655489567", name: "ops-reminders" }],
          isLoading: false,
        })),
      },
      syncRole: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      unlinkRole: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      updatePermissions: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      updateIssueReminders: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      updateEmailAudience: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      updateEventFeedbackExclusion: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutate: feedbackMutate,
        })),
      },
    },
  },
}));

vi.mock("@forge/ui/toast", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// jsdom implements no `matchMedia`, and the issue-reminder section's
// `ResponsiveComboBox` calls it on mount (`packages/ui/src/use-media-query.tsx`),
// so without this stub the whole dialog fails to render. Pinned to the desktop
// branch; nothing below asserts on the responsive fork.
vi.stubGlobal("matchMedia", (media: string) => ({
  addEventListener: () => undefined,
  matches: true,
  media,
  removeEventListener: () => undefined,
}));

const detail = {
  assignmentCount: 7,
  canRemoveAdmin: true,
  dependencies: {
    eventBlockers: [],
    events: 0,
    formResponses: 2,
    formSections: 1,
    issueVisibility: 4,
    issues: 3,
    total: 10,
  },
  dependencyCount: 10,
  discordRoleId: "990000000000000001",
  emailAudienceEnabled: true,
  eventFeedbackExcluded: false,
  feedbackExclusionImpact: { pastEventCount: 3 },
  id: "00000000-0000-4000-8000-000000000001",
  isCosmetic: false,
  isMissing: false,
  issueReminderChannel: "1459204271655489567",
  issueRemindersEnabled: true,
  memberCount: 12,
  name: "Design",
  permissions: ["READ_MEMBERS"],
  position: 4,
  storedName: "Design",
  syncState: "available",
  teamHexcodeColor: "#6d28d9",
} as RouterOutputs["roles"]["getRole"];

describe("RoleDetailDialog", () => {
  it("organizes metadata, dependencies, permissions, sync, and unlink controls", () => {
    const html = renderToStaticMarkup(
      createElement(RoleDetailDialog, {
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Design");
    expect(html).toContain("Discord members");
    expect(html).toContain("Blade assignments");
    expect(html).toContain("Downstream use");
    expect(html).toContain("Form sections");
    expect(html).toContain("Issue visibility rules");
    expect(html).toContain("Blade permissions");
    expect(html).toContain("Issue reminders");
    expect(html).toContain("Team email audience");
    expect(html).toContain("ops-reminders");
    expect(html).toContain("Sync now");
    expect(html).toContain("Unlink role");
  });

  it("explains final-administrator protection", () => {
    const html = renderToStaticMarkup(
      createElement(RoleDetailDialog, {
        detail: { ...detail, canRemoveAdmin: false, dependencies: null },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain(
      "This is the final assigned role administrator and cannot be unlinked.",
    );
  });
});

// jsdom rather than `renderToStaticMarkup`, because what is being pinned is a
// guard: turning this flag on hides every response already collected against
// this role's past events, and the only thing standing between the switch and
// that write is client state. `apps/blade/src/tests/setup.ts` names exactly
// that as the case a DOM test is for.
function renderDialog(overrides: Partial<RouterOutputs["roles"]["getRole"]>) {
  return render(
    createElement(RoleDetailDialog, {
      detail: { ...detail, ...overrides },
      onChanged: vi.fn(),
      onClose: vi.fn(),
    }),
  );
}

function feedbackSection() {
  return within(screen.getByRole("region", { name: "Event feedback" }));
}

describe("TC-021: the feedback switch matches the section it sits beside", () => {
  beforeEach(() => feedbackMutate.mockClear());

  it("keeps Save disabled until the value differs from the prop", async () => {
    const user = userEvent.setup();
    renderDialog({});
    const section = feedbackSection();
    const save = section.getByRole("button", {
      name: /save feedback setting/i,
    });

    expect(save).toBeDisabled();

    await user.click(
      section.getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      }),
    );
    expect(save).toBeEnabled();
  });

  it("writes nothing when the switch alone is toggled", async () => {
    const user = userEvent.setup();
    renderDialog({});

    await user.click(
      feedbackSection().getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      }),
    );

    expect(feedbackMutate).not.toHaveBeenCalled();
  });

  // Class contract, not a measurement: jsdom loads no CSS, so what is asserted
  // is that the token overriding the `h-9` default in `@forge/ui` is present.
  it("gives the switch row and Save button an explicit 44px hit target", () => {
    renderDialog({});
    const section = feedbackSection();
    const row = section
      .getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      })
      .closest("div");

    expect(row?.className).toContain("min-h-11");
    expect(
      section.getByRole("button", { name: /save feedback setting/i }).className,
    ).toContain("min-h-11");
  });
});

describe("TC-022: turning the feedback flag on warns before it writes", () => {
  beforeEach(() => feedbackMutate.mockClear());

  async function toggleOnAndSave(user: ReturnType<typeof userEvent.setup>) {
    const section = feedbackSection();
    await user.click(
      section.getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      }),
    );
    await user.click(
      section.getByRole("button", { name: /save feedback setting/i }),
    );
  }

  it("confirms with the past-event count before firing the mutation", async () => {
    const user = userEvent.setup();
    renderDialog({});
    await toggleOnAndSave(user);

    expect(feedbackMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        name: "Exclude Design from event feedback?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3 past events stop being readable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/feedback analytics and CSV export/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /re-checked against the live role set rather than the set that applied when the feedback was collected/i,
      ),
    ).toBeInTheDocument();
  });

  it("fires exactly one mutation once confirmed", async () => {
    const user = userEvent.setup();
    renderDialog({});
    await toggleOnAndSave(user);

    await user.click(
      screen.getByRole("button", { name: /exclude from feedback/i }),
    );

    expect(feedbackMutate).toHaveBeenCalledTimes(1);
    expect(feedbackMutate).toHaveBeenCalledWith({
      excluded: true,
      roleId: detail.id,
    });
  });

  it("cancels back to the saved value and writes nothing", async () => {
    const user = userEvent.setup();
    renderDialog({});
    await toggleOnAndSave(user);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(feedbackMutate).not.toHaveBeenCalled();
    expect(
      feedbackSection().getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      }),
    ).not.toBeChecked();
  });

  // The officer is agreeing to a rule change, not only to a number, so zero
  // still confirms rather than skipping straight to the write.
  it("still confirms, and says zero, when nothing is lost", async () => {
    const user = userEvent.setup();
    renderDialog({ feedbackExclusionImpact: { pastEventCount: 0 } });
    await toggleOnAndSave(user);

    expect(feedbackMutate).not.toHaveBeenCalled();
    expect(
      screen.getByText(/0 past events stop being readable/i),
    ).toBeInTheDocument();
  });

  it("saves directly when the flag is turned off", async () => {
    const user = userEvent.setup();
    renderDialog({ eventFeedbackExcluded: true });
    const section = feedbackSection();

    await user.click(
      section.getByRole("switch", {
        name: /exclude this role's events from feedback/i,
      }),
    );
    await user.click(
      section.getByRole("button", { name: /save feedback setting/i }),
    );

    expect(
      screen.queryByRole("button", { name: /exclude from feedback/i }),
    ).toBeNull();
    expect(feedbackMutate).toHaveBeenCalledTimes(1);
    expect(feedbackMutate).toHaveBeenCalledWith({
      excluded: false,
      roleId: detail.id,
    });
  });
});
