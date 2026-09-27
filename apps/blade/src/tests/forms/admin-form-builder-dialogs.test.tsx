/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function renderBuilder(
  recruiting = false,
  available = true,
  invalidMappings = false,
  active = true,
) {
  return render(
    <AdminFormBuilder
      callbacks={[
        {
          available: !recruiting && available,
          description: "Assign a Discord role",
          inputs: [
            {
              allowedSources: ["respondent"],
              fixedInputType: "text",
              key: "discordUserId",
              label: "Discord User ID",
              respondentValues: ["discord_user_id"],
            },
            {
              allowedSources: ["fixed"],
              fixedInputType: "text",
              key: "roleId",
              label: "Discord Role ID",
            },
          ],
          label: "Discord: assign role",
          requiredPermission: "discord.manage",
          slug: "discord.assign-role",
        },
        ...(recruiting
          ? [
              {
                available: true,
                description: "Notify recruiting",
                inputs: [
                  {
                    allowedSources: [
                      "question",
                      "respondent",
                      "fixed",
                    ] as const,
                    fixedInputType: "text" as const,
                    key: "name",
                    label: "Name",
                    respondentValues: ["respondent_name"] as const,
                  },
                  {
                    allowedSources: ["question", "fixed"] as const,
                    fixedInputType: "text" as const,
                    key: "team",
                    label: "Team",
                  },
                ],
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
                active,
                callbackSlug: "recruiting.notify",
                id: "callback-1",
                mappings: invalidMappings
                  ? [
                      {
                        inputKey: "name",
                        source: { kind: "note", value: "legacy" },
                      },
                    ]
                  : [
                      {
                        inputKey: "name",
                        source: {
                          kind: "respondent",
                          value: "respondent_name",
                        },
                      },
                      {
                        inputKey: "team",
                        source: { kind: "fixed", value: "Outreach" },
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
        "You do not have permission to configure these procedures.",
      ),
    ).toBeInTheDocument();
    expect(callbackMocks.configure).not.toHaveBeenCalled();
  });

  it("[TC-007, TC-008, TC-009] defaults to an allowed action, edits saved settings and confirms saving", async () => {
    const user = userEvent.setup();
    renderBuilder(true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    expect(
      screen.getByRole("combobox", { name: "Procedure" }),
    ).toHaveTextContent("Notify recruiting");
    expect(screen.getByText("Manual: Outreach")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit mappings" }));
    expect(screen.getByRole("textbox", { name: "Team value" })).toHaveValue(
      "Outreach",
    );
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
          inputKey: "name",
          source: { kind: "respondent", value: "respondent_name" },
        },
        {
          inputKey: "team",
          source: { kind: "fixed", value: "Outreach" },
        },
      ],
    });
    expect(callbackMocks.success).toHaveBeenCalledWith(
      "Callback saved for future responses.",
    );
    expect(callbackMocks.refresh).toHaveBeenCalled();
    expect(screen.getByDisplayValue("Your name")).toBeInTheDocument();
  });

  it("[TC-016] prevents one question from filling two procedure inputs", async () => {
    const user = userEvent.setup();
    renderBuilder(true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    await user.click(screen.getByRole("button", { name: "Edit mappings" }));

    await user.click(screen.getByRole("combobox", { name: "Name source" }));
    await user.click(
      screen.getByRole("option", { name: "Question: Your name" }),
    );
    await user.click(screen.getByRole("combobox", { name: "Team source" }));

    expect(
      screen.getByRole("option", { name: "Question: Your name" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("re-enables a disabled callback with its saved mappings", async () => {
    const user = userEvent.setup();
    renderBuilder(true, true, false, false);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));

    expect(screen.getByText("Disabled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(callbackMocks.configure).toHaveBeenCalledWith({
      callbackSlug: "recruiting.notify",
      formId: "form-1",
      mappings: [
        {
          inputKey: "name",
          source: { kind: "respondent", value: "respondent_name" },
        },
        {
          inputKey: "team",
          source: { kind: "fixed", value: "Outreach" },
        },
      ],
    });
    expect(callbackMocks.success).toHaveBeenCalledWith(
      "Callback enabled for future responses.",
    );
    expect(callbackMocks.disable).not.toHaveBeenCalled();
  });

  it("requires legacy callback mappings to be reviewed before saving", async () => {
    const user = userEvent.setup();
    renderBuilder(true, true, true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));

    expect(
      screen.getByText(
        "These saved mappings use an older format. Edit and resave them before this callback can run.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit mappings" }));
    expect(
      screen.getByText(
        "Choose a current source for the saved inputs before saving.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save for future responses" }),
    ).toBeDisabled();
  });

  it("[TC-009] keeps callback failures in the dialog", async () => {
    callbackMocks.configure.mockRejectedValueOnce(
      new Error("Configuration rejected"),
    );
    callbackMocks.disable.mockRejectedValueOnce(new Error("Disable rejected"));
    const user = userEvent.setup();
    renderBuilder(true);
    await user.click(screen.getByRole("button", { name: /callbacks/i }));
    await user.click(screen.getByRole("button", { name: "Edit mappings" }));
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
