/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DetailSheet } from "~/app/_components/admin/logs/admin-logs-dashboard";

const queryState = vi.hoisted(() => ({
  error: null as Error | null,
  isPending: true,
}));

vi.mock("~/trpc/react", () => ({
  api: {
    audit: {
      detail: {
        useQuery: () => ({
          data: undefined,
          error: queryState.error,
          isPending: queryState.isPending,
        }),
      },
    },
  },
}));

const EVENT_ID = "00000000-0000-4000-8000-000000000003";

describe("audit detail sheet accessibility", () => {
  it("names the dialog while detail is loading", () => {
    queryState.isPending = true;
    queryState.error = null;

    render(<DetailSheet eventId={EVENT_ID} onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "Audit event detail" }),
    ).toBeInTheDocument();
  });

  it("names and describes the dialog when detail fails", () => {
    queryState.isPending = false;
    queryState.error = new Error("Detail request failed");

    render(<DetailSheet eventId={EVENT_ID} onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "Audit detail unavailable" }),
    ).toHaveAccessibleDescription(
      "The selected audit event could not be loaded.",
    );
    expect(screen.getByText("Detail request failed")).toBeInTheDocument();
  });
});
