import { beforeEach, describe, expect, it, vi } from "vitest";

import { caseStudiesRouter } from "../../case-studies/router";

const mocks = vi.hoisted(() => ({
  createStudy: vi.fn(),
  decideConsent: vi.fn(),
  saveDraft: vi.fn(),
  submitStudy: vi.fn(),
}));

vi.mock("../../case-studies/service", () => ({
  acceptTransfer: vi.fn(),
  confirmContributor: vi.fn(),
  createStudy: mocks.createStudy,
  decideConsent: mocks.decideConsent,
  getMyAttribution: vi.fn(),
  getMyStudy: vi.fn(),
  inviteContributor: vi.fn(),
  listContributors: vi.fn(),
  listInvitations: vi.fn(),
  listMyStudies: vi.fn(),
  offerTransfer: vi.fn(),
  redeemInvitation: vi.fn(),
  removeContributor: vi.fn(),
  revokeInvitation: vi.fn(),
  saveDraft: mocks.saveDraft,
  setContributorEdit: vi.fn(),
  submitStudy: mocks.submitStudy,
  withdrawStudy: vi.fn(),
}));

const content = {
  title: "A technical case study",
  summary: "How the team built a useful thing.",
  problem: "A real problem for the team.",
  approach: "We considered several designs.",
  implementation: "We implemented the selected design.",
  outcomes: "The prototype worked at the event.",
  technologies: ["TypeScript"],
  links: {},
  images: [],
};
const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

const caller = (userId: string | null) =>
  caseStudiesRouter.createCaller({ headers: new Headers(), userId });

describe("Projects authoring procedure boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a verified principal for every operation", async () => {
    await expect(
      caller(null).create({ slug: "my-project" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(null).listMine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller(null).saveDraft({ caseStudyId: id, expectedVersion: 0, content }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.createStudy).not.toHaveBeenCalled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("passes only the verified context identity into mutations", async () => {
    mocks.createStudy.mockResolvedValue({ id, slug: "my-project" });
    mocks.saveDraft.mockResolvedValue({ version: 1 });
    await caller(id).create({ slug: "my-project" });
    await caller(otherId).saveDraft({
      caseStudyId: id,
      expectedVersion: 0,
      content,
    });
    expect(mocks.createStudy).toHaveBeenCalledWith(id, "my-project");
    expect(mocks.saveDraft).toHaveBeenCalledWith(otherId, {
      caseStudyId: id,
      expectedVersion: 0,
      content: { ...content, claims: [] },
    });
  });

  it("rejects forged identity fields and invalid content before the service", async () => {
    await expect(
      caller(id).create({ slug: "my-project", ownerUserId: otherId } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(id).saveDraft({
        caseStudyId: id,
        expectedVersion: 0,
        content: { ...content, links: { demo: "http://example.com" } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createStudy).not.toHaveBeenCalled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("validates the author connection and consent policy inputs", async () => {
    await expect(
      caller(id).submit({
        caseStudyId: id,
        expectedVersion: 0,
        authorConnection: "visitor" as never,
        privateEvidenceUrls: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(id).decideConsent({
        caseStudyId: id,
        attributionHash: "x",
        policyVersion: 1,
        action: "accept",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.submitStudy).not.toHaveBeenCalled();
    expect(mocks.decideConsent).not.toHaveBeenCalled();
  });

  it("has no public or editorial procedures", () => {
    const paths = Object.keys(caseStudiesRouter._def.procedures);
    expect(paths).not.toContain("publish");
    expect(paths).not.toContain("review");
    expect(paths).not.toContain("publicList");
    expect(paths).not.toContain("publicDetail");
  });
});
