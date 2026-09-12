/** @vitest-environment jsdom */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { ProjectClaimsPanel } from "~/app/_components/judging/project-claims-panel";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  invalidate: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@forge/ui/toast", () => ({
  toast: { success: vi.fn(), error: mocks.error },
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      judging: { getClaimsAdmin: { invalidate: mocks.invalidate } },
    }),
    judging: {
      getClaimsAdmin: {
        useQuery: () => ({
          data: {
            published: false,
            emergency: false,
            claimUrl: "https://hack.example/claim",
            locked: false,
            members: [],
          },
          isPending: false,
        }),
      },
      sendClaimLinks: { useMutation: () => ({ mutateAsync: mocks.send }) },
      copyClaimLink: { useMutation: () => ({ isPending: false }) },
    },
  },
}));
afterEach(cleanup);

it("continues past a failed batch and reports all deliveries", async () => {
  const user = userEvent.setup();
  const cursor = "00000000-0000-4000-8000-000000000005";
  mocks.send
    .mockResolvedValueOnce({
      sent: 0,
      failed: 5,
      hasMore: true,
      nextMemberId: cursor,
    })
    .mockResolvedValueOnce({ sent: 5, failed: 0, hasMore: false });
  render(
    <ProjectClaimsPanel hackathonId="00000000-0000-4000-8000-000000000001" />,
  );
  await user.click(screen.getByRole("button", { name: "Send claim links" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Send claim links",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(mocks.send).toHaveBeenLastCalledWith(
    expect.objectContaining({ afterMemberId: cursor }),
  );
  expect(mocks.error).toHaveBeenCalledWith(
    "5 sent, 5 failed. Retry to resend failed links.",
  );
  expect(mocks.invalidate).toHaveBeenCalledOnce();
});
