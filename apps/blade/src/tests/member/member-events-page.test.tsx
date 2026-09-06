import { beforeEach, describe, expect, it, vi } from "vitest";

import MemberEventsPage from "~/app/member/events/page";

const { auth, listMemberEvents, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  listMemberEvents: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("~/server/auth", () => ({ auth }));
vi.mock("~/trpc/server", () => ({
  api: { event: { listMemberEvents } },
}));
vi.mock("~/app/_components/member/member-events-dashboard", () => ({
  MemberEventsDashboard: () => null,
}));

describe("member event sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
  });

  it.each([
    [
      "00000000-0000-4000-8000-000000000701",
      "?selected=00000000-0000-4000-8000-000000000701",
    ],
    [undefined, ""],
    [["first", "second"], ""],
  ])(
    "preserves a single selected ID through sign-in (%s)",
    async (selected, query) => {
      const callbackURL = `/member/events${query}`;
      const signInURL = `/api/auth/signin?provider=discord&callbackURL=${encodeURIComponent(callbackURL)}`;

      await expect(
        MemberEventsPage({ searchParams: Promise.resolve({ selected }) }),
      ).rejects.toThrow(signInURL);
      expect(redirect).toHaveBeenCalledWith(signInURL);
      expect(listMemberEvents).not.toHaveBeenCalled();
    },
  );
});
