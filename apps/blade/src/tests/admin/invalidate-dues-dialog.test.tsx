/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
  ADMIN_MEMBER_DUES_SECOND_CONFIRMATION,
} from "@forge/validators";

import { InvalidateDuesDialog } from "~/app/_components/admin/members/invalidate-dues-dialog";

// `vi.mock` factories are hoisted above the module body, so the spies they
// close over have to be created with `vi.hoisted`.
const { mutate, toastInfo } = vi.hoisted(() => ({
  mutate: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    memberAdmin: {
      invalidateEffectiveDues: {
        useMutation: () => ({ isPending: false, mutate }),
      },
    },
  },
}));

vi.mock("@forge/ui/toast", () => ({
  toast: { error: vi.fn(), info: toastInfo, success: vi.fn() },
}));

// This dialog invalidates dues for every currently-paid member at once, and its
// only safeguards are client state: a three-step escalation and two exact-match
// typed confirmations. None of that is reachable by `renderToStaticMarkup`,
// which is how the other 43 Blade test files render — a regression that let
// `Continue` through early, or accepted a near-miss confirmation string, would
// have shipped green.
describe("invalidate dues dialog", () => {
  beforeEach(() => {
    mutate.mockClear();
    toastInfo.mockClear();
  });

  async function openToStepTwo(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getByRole("button", { name: /invalidate all dues/i }),
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
  }

  it("keeps Continue disabled until the second confirmation matches exactly", async () => {
    const user = userEvent.setup();
    render(<InvalidateDuesDialog onComplete={vi.fn()} />);
    await openToStepTwo(user);

    const input = screen.getByLabelText(/second confirmation/i);
    const advance = screen.getByRole("button", { name: /^continue$/i });
    expect(advance).toBeDisabled();

    // One character short of the required sentence.
    await user.type(input, ADMIN_MEMBER_DUES_SECOND_CONFIRMATION.slice(0, -1));
    expect(advance).toBeDisabled();

    await user.type(input, ADMIN_MEMBER_DUES_SECOND_CONFIRMATION.slice(-1));
    expect(advance).toBeEnabled();
  });

  it("clears the typed confirmation between steps so it is never carried forward", async () => {
    const user = userEvent.setup();
    render(<InvalidateDuesDialog onComplete={vi.fn()} />);
    await openToStepTwo(user);

    await user.type(
      screen.getByLabelText(/second confirmation/i),
      ADMIN_MEMBER_DUES_SECOND_CONFIRMATION,
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(screen.getByLabelText(/final confirmation/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /invalidate effective dues/i }),
    ).toBeDisabled();
  });

  it("only fires the mutation once the final confirmation matches", async () => {
    const user = userEvent.setup();
    render(<InvalidateDuesDialog onComplete={vi.fn()} />);
    await openToStepTwo(user);

    await user.type(
      screen.getByLabelText(/second confirmation/i),
      ADMIN_MEMBER_DUES_SECOND_CONFIRMATION,
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    const confirm = screen.getByRole("button", {
      name: /invalidate effective dues/i,
    });
    await user.type(
      screen.getByLabelText(/final confirmation/i),
      ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
    );
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      confirmation: ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
    });
  });

  it("refuses a pasted confirmation so the sentence has to be typed", async () => {
    const user = userEvent.setup();
    render(<InvalidateDuesDialog onComplete={vi.fn()} />);
    await openToStepTwo(user);

    const input = screen.getByLabelText(/second confirmation/i);
    await user.click(input);
    await user.paste(ADMIN_MEMBER_DUES_SECOND_CONFIRMATION);

    expect(input).toHaveValue("");
    expect(toastInfo).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
  });
});
