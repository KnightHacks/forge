/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentifiedResponses } from "~/app/_components/admin/forms/form-responses-dashboard";
import { GenericFormRespondent } from "~/app/_components/forms/generic-form-respondent";
import { GenericFormResponseForm } from "~/app/_components/forms/generic-form-response-form";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  save: vi.fn(),
  success: vi.fn(),
  pending: false,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/form/test-form",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@forge/ui/toast", () => ({ toast: { success: mocks.success } }));
vi.mock("~/trpc/react", () => {
  const useMutation = (options: {
    onSuccess: (result: { formResponseId: string }) => void;
  }) => ({
    isPending: mocks.pending,
    mutateAsync: async (input: unknown) => {
      const result = (await mocks.save(input)) as { formResponseId: string };
      options.onSuccess(result);
      return result;
    },
  });
  return {
    api: {
      forms: {
        createResponse: { useMutation },
        updateResponse: { useMutation },
      },
    },
  };
});

const questionId = "10000000-0000-4000-8000-000000000001";
const definition = {
  title: "Test form",
  description: "Synthetic fixture",
  instructions: [],
  questions: [
    {
      id: questionId,
      prompt: "Your note",
      type: "short_text" as const,
      maxLength: 100,
      required: true,
      retired: false,
    },
  ],
};
const response = {
  answers: { [questionId]: "Saved answer" },
  member: {
    name: "Test Member",
    email: "synthetic@example.invalid",
    id: "member-1",
  },
  responseId: "response-1",
  snapshot: definition,
  submittedAt: new Date("2026-08-01T12:00:00Z"),
};

describe("form action feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending = false;
    mocks.save.mockResolvedValue({ formResponseId: "response-1" });
  });

  it("[TC-012] prevents another submit while the request is pending", async () => {
    mocks.pending = true;
    const user = userEvent.setup();
    render(
      <GenericFormResponseForm
        definition={definition}
        formId="form-1"
        initialAnswers={{ [questionId]: "Saved answer" }}
      />,
    );
    const button = screen.getByRole("button", { name: "Submit response" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("[TC-010] keeps a success receipt while routing to the saved response", async () => {
    const user = userEvent.setup();
    render(<GenericFormResponseForm definition={definition} formId="form-1" />);
    await user.type(screen.getByRole("textbox"), "Keep my answer");
    await user.click(screen.getByRole("button", { name: "Submit response" }));
    expect(
      await screen.findByRole("heading", { name: "Response submitted" }),
    ).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/form/test-form?responseId=response-1",
    );
    expect(
      screen.getByRole("link", { name: "Review submitted response" }),
    ).toHaveAttribute("href", "/form/test-form?responseId=response-1");
    expect(
      screen.queryByRole("button", { name: "Submit response" }),
    ).not.toBeInTheDocument();
  });

  it("[TC-012] retains answers and displays a rejected submission", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Submission failed"));
    const user = userEvent.setup();
    render(<GenericFormResponseForm definition={definition} formId="form-1" />);
    await user.type(screen.getByRole("textbox"), "Keep my answer");
    await user.click(screen.getByRole("button", { name: "Submit response" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Submission failed",
    );
    expect(screen.getByRole("textbox")).toHaveValue("Keep my answer");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("[TC-011] announces an editable response update", async () => {
    const user = userEvent.setup();
    render(
      <GenericFormResponseForm
        definition={definition}
        formId="form-1"
        mode="edit"
        initialAnswers={{ [questionId]: "Saved answer" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save response" }));
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith("Response updated."),
    );
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("Saved answer");
  });

  it.each(["multiple_locked", "single_locked", "single_editable"] as const)(
    "[TC-010, TC-011] receipt offers another response only in multiple mode: %s",
    (responseMode) => {
      render(
        <GenericFormRespondent
          definition={{
            ...definition,
            id: "form-1",
            name: "Test form",
            slugName: "test-form",
            responseMode,
          }}
          respondentState={{
            status: "submitted",
            answers: [],
            editable: responseMode === "single_editable",
            responseId: "response-1",
            submittedAt: "2026-08-01T12:00:00Z",
          }}
        />,
      );
      expect(
        screen.getByRole("heading", { name: "Response submitted" }),
      ).toBeInTheDocument();
      const link = screen.queryByRole("link", {
        name: "Submit another response",
      });
      if (responseMode === "multiple_locked")
        expect(link).toHaveAttribute("href", "/form/test-form");
      else expect(link).not.toBeInTheDocument();
    },
  );

  it("[TC-013] waits for deletion before closing the detail", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {
      throw new Error("Deletion not started");
    };
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <IdentifiedResponses
        deletePending={false}
        onDelete={onDelete}
        responses={[response]}
      />,
    );
    const [viewButton] = screen.getAllByRole("button", {
      name: "View response",
    });
    if (!viewButton) throw new Error("Response action missing");
    await user.click(viewButton);
    await user.click(screen.getByRole("button", { name: "Delete response" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    finish();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(onDelete).toHaveBeenCalledWith("response-1");
  });

  it("[TC-013] retains the detail on deletion failure and supports cancel", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("Deletion failed"));
    render(
      <IdentifiedResponses
        deletePending={false}
        onDelete={onDelete}
        responses={[response]}
      />,
    );
    const [viewButton] = screen.getAllByRole("button", {
      name: "View response",
    });
    if (!viewButton) throw new Error("Response action missing");
    await user.click(viewButton);
    await user.click(screen.getByRole("button", { name: "Delete response" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete response" }));
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );
    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("Deletion failed");
    expect(screen.getByText("Saved answer")).toBeInTheDocument();
  });
});
