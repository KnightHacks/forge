/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShieldCheck } from "lucide-react";
import { describe, expect, it } from "vitest";

import { AdminPageHeader } from "~/app/_components/shared/admin-page";

describe("AdminPageHeader information tooltip", () => {
  it("TC-005 exposes the description on focus without rendering the eyebrow", async () => {
    render(
      <AdminPageHeader
        description="Manage the workspace."
        eyebrow="Club operations"
        icon={ShieldCheck}
        title="Administration"
      />,
    );

    const info = screen.getByRole("button", { name: "About this page" });

    expect(screen.queryByText("Club operations")).toBeNull();
    expect(screen.getByText("Manage the workspace.")).toHaveClass("sr-only");

    await userEvent.tab();
    expect(info).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Manage the workspace.",
    );
  });
});
