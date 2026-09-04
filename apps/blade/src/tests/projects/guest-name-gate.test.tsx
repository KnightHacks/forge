/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GuestNameGate } from "~/app/_components/judging/guest-name-gate";

const completeGuest = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      completeGuest: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: completeGuest,
        }),
      },
    },
  },
}));

describe("guest judge name gate", () => {
  it("requires a name and explains how identity data is used", async () => {
    const user = userEvent.setup();
    render(<GuestNameGate />);

    const submit = screen.getByRole("button", { name: "Enter judging room" });
    expect(submit).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Please introduce yourself. Your name will be used for judging deliberation and identity verification. Your responses will NOT be shared.",
    );

    await user.type(screen.getByLabelText("Name"), "A");
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Casey Sponsor");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(completeGuest).toHaveBeenCalledWith({
      displayName: "Casey Sponsor",
    });
  });
});
