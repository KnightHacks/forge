/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FormDefinition } from "@forge/validators";

import { AdminFormBuilder } from "~/app/_components/admin/forms/admin-form-builder";

const callbackMocks = vi.hoisted(() => ({
  configure: vi.fn(),
  disable: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { success: callbackMocks.success },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/forms/form-1",
  useRouter: () => ({ refresh: callbackMocks.refresh, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mutation = () => ({ isPending: false, mutateAsync: vi.fn() });

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      changeState: { useMutation: () => mutation() },
      configureCallback: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: callbackMocks.configure,
        }),
      },
      createForm: { useMutation: () => mutation() },
      createUpload: { useMutation: () => mutation() },
      deleteForm: { useMutation: () => mutation() },
      disableCallback: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: callbackMocks.disable,
        }),
      },
      finalizeUpload: { useMutation: () => mutation() },
      updateForm: { useMutation: () => mutation() },
      updateSettings: { useMutation: () => mutation() },
    },
  },
}));

const definition: FormDefinition = {
  description: "A description",
  instructions: [{ body: "Read this first.", id: "text-1", type: "text" }],
  questions: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      maxLength: 500,
      prompt: "Your name",
      required: true,
      retired: false,
      type: "short_text",
    },
  ],
  title: "Fixture form",
};

function renderBuilder(recruiting = false, available = true) {
  return render(
    <AdminFormBuilder
      callbacks={[
        {
          available: !recruiting && available,
          description: "Assign a Discord role",
          label: "Discord: assign role",
          requiredPermission: "discord.manage",
          slug: "discord.assign-role",
        },
        ...(recruiting
          ? [
              {
                available: true,
                description: "Notify recruiting",
                label: "Notify recruiting",
                requiredPermission: "EDIT_FORMS",
                slug: "recruiting.notify",
              },
            ]
          : []),
      ]}
      configuredCallbacks={
        recruiting
          ? [
              {
                active: true,
                callbackSlug: "recruiting.notify",
                id: "callback-1",
                mappings: [
                  {
                    inputKey: "memberId",
                    source: { kind: "system", value: "member_id" },
                  },
                  {
                    inputKey: "note",
                    source: { kind: "fixed", value: "Saved recruiting note" },
                  },
                ],
              },
            ]
          : []
      }
      initial={{
        closesAt: null,
        definition,
        duesOnly: false,
        id: "form-1",
        manuallyClosed: false,
        name: "Fixture form",
        opensAt: null,
        respondentRoleIds: ["role-1"],
        responseMode: "single_locked",
        revision: 4,
        sectionId: "section-2",
        slugName: "fixture-form",
        state: "draft",
      }}
      respondentRoles={[
        { id: "role-1", name: "Member" },
        { id: "role-2", name: "Officer" },
      ]}
      sections={[
        { id: "section-1", name: "General" },
        { id: "section-2", name: "Recruiting" },
      ]}
    />,
  );
}

// The builder owns three dialogs — availability, callbacks, and the delete
// confirmation — and each is reached only from a header button the previous one
// covers. They are held as one value rather than three booleans, so what has to
// stay true is that a header button opens its own dialog and closes whichever
// was open. Nothing here asserts markup or layout.
describe("admin form builder dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callbackMocks.configure.mockResolvedValue({});
    callbackMocks.disable.mockResolvedValue({});
  });

  it("[TC-007] prevents configuration when no callback is permitted", async () => {
    const user = userEvent.setup();
    renderBuilder(false, false);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    expect(
      screen.getByRole("button", { name: "Save for future responses" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "You do not have permission to configure these actions.",
      ),
    ).toBeInTheDocument();
    expect(callbackMocks.configure).not.toHaveBeenCalled();
  });

  it("[TC-007, TC-008, TC-009] defaults to an allowed action, edits saved settings and confirms saving", async () => {
    const user = userEvent.setup();
    renderBuilder(true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    expect(screen.getByRole("combobox", { name: "Action" })).toHaveTextContent(
      "Notify recruiting",
    );
    expect(
      screen.getByText("Fixed note: Saved recruiting note"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit settings" }));
    expect(
      screen.getByRole("textbox", { name: "Recruiting note" }),
    ).toHaveValue("Saved recruiting note");
    await user.click(
      screen.getByRole("button", { name: "Save for future responses" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(callbackMocks.configure).toHaveBeenCalledWith({
      callbackSlug: "recruiting.notify",
      formId: "form-1",
      mappings: [
        {
          inputKey: "memberId",
          source: { kind: "system", value: "member_id" },
        },
        {
          inputKey: "note",
          source: { kind: "fixed", value: "Saved recruiting note" },
        },
      ],
    });
    expect(callbackMocks.success).toHaveBeenCalledWith(
      "Callback saved for future responses.",
    );
    expect(callbackMocks.refresh).toHaveBeenCalled();
    expect(screen.getByDisplayValue("Your name")).toBeInTheDocument();
  });

  it("[TC-009] keeps callback failures in the dialog", async () => {
    callbackMocks.configure.mockRejectedValueOnce(
      new Error("Configuration rejected"),
    );
    callbackMocks.disable.mockRejectedValueOnce(new Error("Disable rejected"));
    const user = userEvent.setup();
    renderBuilder(true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    await user.click(screen.getByRole("button", { name: "Edit settings" }));
    await user.click(
      screen.getByRole("button", { name: "Save for future responses" }),
    );
    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("Configuration rejected");
    await user.click(screen.getByRole("button", { name: "Disable" }));
    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("Disable rejected");
    expect(callbackMocks.refresh).not.toHaveBeenCalled();
  });
  it("opens the availability dialog seeded from the saved form", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByRole("button", { name: /settings/i }));

    expect(
      screen.getByRole("heading", { name: /availability & access/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Member" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Officer" })).not.toBeChecked();
  });

  it("keeps an availability edit after the dialog is closed and reopened", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /manually closed/i }),
    );
    await user.click(screen.getByRole("button", { name: /^done$/i }));

    expect(
      screen.queryByRole("heading", { name: /availability & access/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /settings/i }));

    expect(
      screen.getByRole("checkbox", { name: /manually closed/i }),
    ).toBeChecked();
  });

  it("shows one dialog at a time", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByRole("button", { name: /callbacks/i }));

    expect(
      screen.getByRole("heading", { name: /^callbacks$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /availability & access/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /delete form/i }),
    ).not.toBeInTheDocument();
  });

  it("reaches the delete confirmation from the more menu", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: /more form actions/i }),
    );

    expect(
      screen.getByRole("heading", { name: /delete form/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete permanently/i }),
    ).toBeInTheDocument();
  });
});
