/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DropAllProjectsDialog } from "~/app/_components/projects/drop-all-projects-dialog";

const HACKATHON_ID = "00000000-0000-4000-8000-000000000527";
const HACKATHON_NAME = "Knight Hacks IX";
const { mutate, toastInfo } = vi.hoisted(() => ({
  mutate: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    projects: {
      dropAll: {
        useMutation: () => ({ isPending: false, mutate }),
      },
    },
  },
}));

vi.mock("@forge/ui/toast", () => ({
  toast: { error: vi.fn(), info: toastInfo, success: vi.fn() },
}));

describe("drop all projects dialog", () => {
  beforeEach(() => {
    mutate.mockClear();
    toastInfo.mockClear();
  });

  it("requires the exact selected hackathon name before hard deletion", async () => {
    const user = userEvent.setup();
    render(
      <DropAllProjectsDialog
        hackathonId={HACKATHON_ID}
        hackathonName={HACKATHON_NAME}
        onDropped={vi.fn()}
        projectCount={7}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Drop all projects" }));
    const confirmation = screen.getByLabelText("Hackathon name");
    const submit = screen.getByRole("button", {
      name: "Permanently delete projects",
    });

    await user.type(confirmation, "Knight Hacks 9");
    expect(submit).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, HACKATHON_NAME);
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith({
      confirmation: HACKATHON_NAME,
      hackathonId: HACKATHON_ID,
    });
  });

  it("prevents pasting the confirmation", async () => {
    const user = userEvent.setup();
    render(
      <DropAllProjectsDialog
        hackathonId={HACKATHON_ID}
        hackathonName={HACKATHON_NAME}
        onDropped={vi.fn()}
        projectCount={2}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Drop all projects" }));
    const confirmation = screen.getByLabelText("Hackathon name");
    await user.click(confirmation);
    await user.paste(HACKATHON_NAME);

    expect(confirmation).toHaveValue("");
    expect(toastInfo).toHaveBeenCalledOnce();
  });

  it("disables the action when the selected inventory is empty", () => {
    render(
      <DropAllProjectsDialog
        hackathonId={HACKATHON_ID}
        hackathonName={HACKATHON_NAME}
        onDropped={vi.fn()}
        projectCount={0}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Drop all projects" }),
    ).toBeDisabled();
  });
});
