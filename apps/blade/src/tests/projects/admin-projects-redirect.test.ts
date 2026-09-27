import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("admin projects compatibility route", () => {
  beforeEach(() => {
    mocks.redirect.mockReset().mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it("always opens Projects while preserving project filters", async () => {
    const { default: Page } = await import("~/app/admin/projects/page");

    await expect(
      Page({
        searchParams: Promise.resolve({
          challenge: "sponsor",
          hackathon: "kh8",
          page: "2",
          q: "robot",
          tab: "rooms",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/admin/judging?challenge=sponsor&hackathon=kh8&page=2&q=robot&tab=projects",
    );
  });
});
