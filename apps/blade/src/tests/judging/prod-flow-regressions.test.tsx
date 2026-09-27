import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activateJudgingRoom: vi.fn(),
  auth: vi.fn(),
  getContext: vi.fn(),
  getProjectScores: vi.fn(),
  getWorkspace: vi.fn(),
  judgeProjectWorkspace: vi.fn(() => null),
  judgingLiveUpdates: vi.fn(() => null),
  listJudgeHackathons: vi.fn(),
  listJudge: vi.fn(),
  listMyDeliberation: vi.fn(),
  listMySubmissions: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));

vi.mock("@forge/api/judging-access.server", () => ({
  activateJudgingRoom: mocks.activateJudgingRoom,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("~/env", () => ({
  env: {
    BLADE_URL: "https://blade.knighthacks.org",
    NODE_ENV: "production",
  },
}));
vi.mock("~/server/auth", () => ({ auth: mocks.auth }));
vi.mock("~/trpc/server", () => ({
  api: {
    judging: {
      getContext: mocks.getContext,
      getProjectScores: mocks.getProjectScores,
      getWorkspace: mocks.getWorkspace,
      listMyDeliberation: mocks.listMyDeliberation,
      listMySubmissions: mocks.listMySubmissions,
    },
    projects: {
      listJudgeHackathons: mocks.listJudgeHackathons,
      listJudge: mocks.listJudge,
    },
  },
}));
vi.mock("~/app/_components/judging/guest-name-gate", () => ({
  GuestNameGate: () => null,
}));
vi.mock("~/app/_components/projects/judge-project-workspace", () => ({
  JudgeProjectWorkspace: mocks.judgeProjectWorkspace,
}));
vi.mock("~/app/_components/judging/judging-live-updates", () => ({
  JudgingLiveUpdates: mocks.judgingLiveUpdates,
}));

describe("production judging flow regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
  });

  it("redirects room activation from the configured public Blade URL", async () => {
    const challengeId = "40000000-0000-4000-8000-000000000001";
    mocks.activateJudgingRoom.mockResolvedValue({
      challengeId,
      discordDelivery: "skipped",
      kind: "member",
      roomId: "80000000-0000-4000-8000-000000000001",
    });
    const { GET } = await import("~/app/judge/activate/[linkId]/route");

    const response = await GET(
      new Request("http://0.0.0.0:3000/judge/activate/link?signature=signed"),
      { params: Promise.resolve({ linkId: "link" }) },
    );

    expect(response.headers.get("location")).toBe(
      `https://blade.knighthacks.org/judge/projects?challenge=${challengeId}`,
    );
  });

  it("redirects failed activation to the public access error page", async () => {
    mocks.activateJudgingRoom.mockRejectedValue(new Error("invalid"));
    const { GET } = await import("~/app/judge/activate/[linkId]/route");

    const response = await GET(
      new Request("http://0.0.0.0:3000/judge/activate/link?signature=invalid"),
      { params: Promise.resolve({ linkId: "link" }) },
    );

    expect(response.headers.get("location")).toBe(
      "https://blade.knighthacks.org/judge/access-error",
    );
  });

  it("keeps an officer's automatically selected upcoming hackathon", async () => {
    const hackathonId = "30000000-0000-4000-8000-000000000001";
    const challengeId = "40000000-0000-4000-8000-000000000001";
    mocks.getContext.mockResolvedValue({
      activeRoomId: null,
      announcements: [],
      displayName: "Officer",
      hackathon: null,
      isOfficer: true,
      kind: "member",
      rooms: [],
      userId: "10000000-0000-4000-8000-000000000001",
    });
    mocks.listJudge.mockResolvedValue({
      challenges: [],
      hackathon: { id: hackathonId },
      page: 1,
      pageSize: 25,
      projects: [],
      roomFilterUnavailableReason: null,
      selectedChallengeId: challengeId,
      totalCount: 0,
    });
    mocks.listJudgeHackathons.mockResolvedValue([]);
    mocks.getWorkspace.mockResolvedValue({ challengeId });
    mocks.getProjectScores.mockResolvedValue([]);
    mocks.listMySubmissions.mockResolvedValue([]);
    mocks.listMyDeliberation.mockResolvedValue([]);
    const { default: JudgeProjectsPage } =
      await import("~/app/judge/projects/page");

    const page = await JudgeProjectsPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getWorkspace).toHaveBeenCalledWith({
      challengeId,
      hackathonId,
    });
    expect(mocks.listJudge).toHaveBeenCalledWith(
      expect.objectContaining({ direction: "asc", sort: "scheduledAt" }),
    );
    renderToStaticMarkup(page);
    expect(mocks.judgeProjectWorkspace.mock.calls).toMatchObject([
      [{ input: { hackathonId } }, undefined],
    ]);
    expect(mocks.judgingLiveUpdates).toHaveBeenCalledWith(
      { hackathonId },
      undefined,
    );
  });

  it("lets an authenticated judge select a past hackathon", async () => {
    const hackathonId = "30000000-0000-4000-8000-000000000001";
    const currentHackathonId = "30000000-0000-4000-8000-000000000002";
    mocks.getContext.mockResolvedValue({
      activeRoomId: null,
      announcements: [],
      displayName: "Judge",
      hackathon: { id: currentHackathonId },
      isOfficer: false,
      kind: "member",
      rooms: [],
      userId: "10000000-0000-4000-8000-000000000001",
    });
    mocks.listJudge.mockResolvedValue({
      challenges: [],
      hackathon: { id: hackathonId },
      page: 1,
      pageSize: 25,
      projects: [],
      roomFilterUnavailableReason: null,
      selectedChallengeId: null,
      totalCount: 0,
    });
    mocks.listJudgeHackathons.mockResolvedValue([{ id: hackathonId }]);
    const { default: JudgeProjectsPage } =
      await import("~/app/judge/projects/page");

    const page = await JudgeProjectsPage({
      searchParams: Promise.resolve({ hackathon: hackathonId, sort: "title" }),
    });

    expect(mocks.getContext).toHaveBeenCalledWith({});
    expect(mocks.listJudge).toHaveBeenCalledWith(
      expect.objectContaining({ hackathonId, sort: "title" }),
    );
    renderToStaticMarkup(page);
    expect(mocks.judgeProjectWorkspace.mock.calls).toMatchObject([
      [
        {
          hackathons: [{ id: hackathonId }],
          input: { hackathonId },
          readOnly: true,
        },
        undefined,
      ],
    ]);
    expect(mocks.judgingLiveUpdates).toHaveBeenCalledWith(
      { hackathonId },
      undefined,
    );
  });
});
