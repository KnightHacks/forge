/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormResponsesDashboard } from "~/app/_components/admin/forms/form-responses-dashboard";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  retry: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  result: { status: "failed" } as {
    status: "failed" | "succeeded" | "superseded";
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/forms/test/responses",
  useSearchParams: () => new URLSearchParams("view=delivery"),
  useRouter: () => ({ refresh: mocks.refresh, replace: vi.fn() }),
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { success: mocks.success, error: mocks.error, info: mocks.info },
}));
vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      exportResponses: {
        useQuery: () => ({ isFetching: false, refetch: vi.fn() }),
      },
      deleteResponse: { useMutation: () => ({ isPending: false }) },
      retryCallback: {
        useMutation: (options: {
          onSuccess: (result: typeof mocks.result) => void;
          onSettled: () => void;
        }) => ({
          isPending: false,
          mutate: (input: unknown) => {
            mocks.retry(input);
            options.onSuccess(mocks.result);
            options.onSettled();
          },
        }),
      },
    },
  },
}));

const execution = {
  id: "execution-1",
  callbackSlug: "recruiting.notify",
  status: "failed" as const,
  attempts: 1,
  lastError: "Synthetic provider error",
  responseId: "response-1",
  createdAt: new Date("2026-08-01T12:00:00Z"),
  updatedAt: new Date("2026-08-01T12:00:00Z"),
};

describe("callback delivery feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it.each(["failed", "succeeded", "superseded"] as const)(
    "[TC-014] reports actual retry outcome: %s",
    async (status) => {
      mocks.result = { status };
      const user = userEvent.setup();
      render(
        <FormResponsesDashboard
          callbacks={[execution]}
          callbackCatalog={[
            {
              slug: "recruiting.notify",
              label: "Notify recruiting",
              available: true,
              requiredPermission: "EDIT_FORMS",
              description: "Notify recruiting",
              inputs: [],
            },
          ]}
          formId="form-1"
          responses={null}
          responsesError={null}
        />,
      );
      expect(screen.getByText("Notify recruiting")).toBeInTheDocument();
      expect(screen.getByText("recruiting.notify")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(mocks.retry).toHaveBeenCalledWith({ executionId: "execution-1" });
      expect(mocks.refresh).toHaveBeenCalled();
      if (status === "succeeded")
        expect(mocks.success).toHaveBeenCalledWith("Callback delivered.");
      else {
        expect(mocks.success).not.toHaveBeenCalled();
        if (status === "failed") expect(mocks.error).toHaveBeenCalled();
        else expect(mocks.info).toHaveBeenCalled();
      }
    },
  );

  it("[TC-014] never offers retry for cancelled or deleted responses", () => {
    render(
      <FormResponsesDashboard
        callbacks={[
          { ...execution, status: "cancelled" },
          { ...execution, id: "execution-2", responseId: null },
        ]}
        formId="form-1"
        responses={null}
        responsesError={null}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });
});
