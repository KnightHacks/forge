/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MapConfigurationSection } from "~/app/_components/admin/hackathon/map-configuration-section";

const mutation = vi.hoisted(() => ({ mutate: vi.fn(), error: false }));
vi.mock("~/trpc/react", () => ({
  api: {
    hackathon: {
      saveMapConfiguration: {
        useMutation: (options: {
          onError: (error: Error) => void;
          onSuccess: () => void;
        }) => ({
          isPending: false,
          mutate: (input: unknown) => {
            mutation.mutate(input);
            if (mutation.error)
              options.onError(new Error("Save failed. Retry."));
            else options.onSuccess();
          },
        }),
      },
    },
  },
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const detail: Parameters<typeof MapConfigurationSection>[0]["detail"] = {
  hackathon: { id: "50000000-0000-4000-8000-000000000581" },
  mapConfiguration: { restrictionsEnabled: false, rooms: [], updatedAt: null },
};

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("map configuration saves", () => {
  it("preserves edits on failure and refreshes only after success", async () => {
    mutation.error = true;
    const saved = vi.fn();
    const user = userEvent.setup();
    render(
      <MapConfigurationSection
        detail={detail}
        isRefreshing={false}
        onSaved={saved}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add room" }));
    await user.click(screen.getByRole("combobox", { name: "Building 1" }));
    await user.click(screen.getByRole("option", { name: "HEC" }));
    await user.type(screen.getByRole("textbox", { name: "Room 1" }), " 101a ");
    await user.type(
      screen.getByRole("textbox", { name: "Name 1" }),
      "Help desk",
    );
    await user.click(
      screen.getByRole("button", { name: "Save map room access" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByRole("textbox", { name: "Room 1" })).toHaveValue(
      " 101a ",
    );
    expect(saved).not.toHaveBeenCalled();
    mutation.error = false;
    await user.click(
      screen.getByRole("button", { name: "Save map room access" }),
    );
    expect(saved).toHaveBeenCalledOnce();
    expect(mutation.mutate).toHaveBeenLastCalledWith({
      hackathonId: detail.hackathon.id,
      restrictionsEnabled: false,
      rooms: [{ buildingId: "hec", roomNumber: "101A", name: "Help desk" }],
    });
  });
  it("rejects a blank room before submitting and disables controls during refresh", async () => {
    mutation.mutate.mockClear();
    const user = userEvent.setup();
    const view = render(
      <MapConfigurationSection
        detail={detail}
        isRefreshing={false}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add room" }));
    await user.click(
      screen.getByRole("button", { name: "Save map room access" }),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mutation.mutate).not.toHaveBeenCalled();
    view.rerender(
      <MapConfigurationSection
        detail={detail}
        isRefreshing={true}
        onSaved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Save map room access" }),
    ).toBeDisabled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
