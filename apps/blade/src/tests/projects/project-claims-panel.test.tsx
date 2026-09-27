/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import {
  CLAIM_SEARCH_DEBOUNCE_MS,
  ProjectClaimsPanel,
} from "~/app/_components/judging/project-claims-panel";

type MockClaims = RouterOutputs["judging"]["getClaimsAdmin"];

interface ClaimsQueryOptions {
  placeholderData?: (previous: MockClaims) => MockClaims;
}

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  invalidate: vi.fn(),
  error: vi.fn(),
  claims: {
    published: false,
    emergency: false,
    claimUrl: "https://hack.example/claim",
    locked: false,
    summary: { sent: 0, claimed: 0, unclaimed: 0 },
    members: [],
  } as MockClaims,
  useClaimsQuery:
    vi.fn<(input: { query: string }, options?: ClaimsQueryOptions) => void>(),
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
        useQuery: (input: { query: string }, options?: ClaimsQueryOptions) => {
          mocks.useClaimsQuery(input, options);
          const data = input.query
            ? options?.placeholderData?.(mocks.claims)
            : mocks.claims;
          return { data, isPending: !data };
        },
      },
      sendClaimLinks: { useMutation: () => ({ mutateAsync: mocks.send }) },
      copyClaimLink: { useMutation: () => ({ isPending: false }) },
    },
  },
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.claims.summary = { sent: 0, claimed: 0, unclaimed: 0 };
  mocks.claims.members = [];
});

it("keeps search focused while the filtered results load", async () => {
  vi.useFakeTimers();
  render(
    <ProjectClaimsPanel hackathonId="00000000-0000-4000-8000-000000000001" />,
  );

  const search = screen.getByRole("textbox", {
    name: "Search claim recipients",
  });
  search.focus();
  fireEvent.change(search, { target: { value: "A" } });
  await act(() => vi.advanceTimersByTimeAsync(150));
  fireEvent.change(search, { target: { value: "Ad" } });
  await act(() => vi.advanceTimersByTimeAsync(150));
  fireEvent.change(search, { target: { value: "Ada" } });

  expect(
    mocks.useClaimsQuery.mock.calls.every(([input]) => input.query === ""),
  ).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(CLAIM_SEARCH_DEBOUNCE_MS - 1));
  expect(
    mocks.useClaimsQuery.mock.calls.every(([input]) => input.query === ""),
  ).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(mocks.useClaimsQuery.mock.lastCall?.[0].query).toBe("Ada");
  expect(search).toHaveFocus();
  expect(search).toHaveValue("Ada");
});

it("highlights claimed links and shows hackathon totals", () => {
  mocks.claims.summary = { sent: 9, claimed: 4, unclaimed: 5 };
  mocks.claims.members = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      projectId: "00000000-0000-4000-8000-000000000020",
      projectTitle: "Useful project",
      name: "Ada Lovelace",
      email: "ada@example.com",
      invited: null,
      userId: "00000000-0000-4000-8000-000000000030",
      firstName: "Ada",
      lastName: "Lovelace",
      discordUserId: null,
      discordUser: null,
      sentAt: new Date(),
      usedAt: new Date(),
    },
  ];

  render(
    <ProjectClaimsPanel hackathonId="00000000-0000-4000-8000-000000000001" />,
  );

  const summary = screen.getByLabelText("Project claim summary");
  expect(
    within(summary).getByRole("definition", { name: "Emails sent" }),
  ).toHaveTextContent("9");
  expect(
    within(summary).getByRole("definition", { name: "Claimed" }),
  ).toHaveTextContent("4");
  expect(
    within(summary).getByRole("definition", { name: "Unclaimed" }),
  ).toHaveTextContent("5");
  const row = screen.getByRole("row", { name: /Ada Lovelace/ });
  expect(within(row).getByText("Profile linked")).toBeInTheDocument();
  expect(within(row).getByText("Link used")).toBeInTheDocument();
});

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
  expect(
    screen.getByRole("definition", { name: "Failed this run" }),
  ).toHaveTextContent("5");
  expect(mocks.invalidate).toHaveBeenCalledOnce();
});
