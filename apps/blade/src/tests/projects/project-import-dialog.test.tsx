/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectImportDialog } from "~/app/_components/projects/project-import-dialog";

const props = {
  hackathonId: "00000000-0000-4000-8000-000000000001",
  hackathonName: "Knight Hacks",
  inventoryLocked: true,
  onImported: vi.fn(),
  projectCount: 3,
};

describe("project import locks", () => {
  afterEach(cleanup);

  it("disables both entry points when imports are disabled", () => {
    render(<ProjectImportDialog {...props} disabled />);
    expect(
      screen.getByRole("button", { name: "Add new projects" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Replace inventory" }),
    ).toBeDisabled();
  });

  it("allows add-only imports while a saved schedule blocks replacement", async () => {
    const user = userEvent.setup();
    render(<ProjectImportDialog {...props} scheduleLocked />);
    expect(
      screen.getByRole("button", { name: "Replace inventory" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Add new projects" }));
    expect(
      screen.getByText(/Only projects with unseen Devpost URLs are added/),
    ).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText("Devpost CSV"),
      new File(["csv"], "projects.csv", { type: "text/csv" }),
    );
    expect(
      screen.getByRole("button", { name: "Add unseen projects" }),
    ).toBeEnabled();
  });

  it("blocks a replacement already open when setup becomes locked", async () => {
    const user = userEvent.setup();
    const view = render(<ProjectImportDialog {...props} />);
    await user.click(screen.getByRole("button", { name: "Replace inventory" }));
    await user.type(
      screen.getByLabelText("Type Knight Hacks to confirm"),
      "Knight Hacks",
    );
    await user.upload(
      screen.getByLabelText("Devpost CSV"),
      new File(["csv"], "projects.csv", { type: "text/csv" }),
    );
    expect(
      screen.getByRole("button", { name: "Revoke access and replace" }),
    ).toBeEnabled();
    view.rerender(<ProjectImportDialog {...props} scheduleLocked />);
    expect(
      screen.getByRole("button", { name: "Revoke access and replace" }),
    ).toBeDisabled();
  });
});
