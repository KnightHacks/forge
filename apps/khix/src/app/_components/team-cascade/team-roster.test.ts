import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadTeamCascadeGroups } from "./team-roster";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("./blade-trpc", () => ({
  getBladeTrpcClient: () => ({
    guild: {
      getPublicClubTeamRoster: {
        query: mocks.query,
      },
    },
  }),
}));

function member(id: string, name: string) {
  return {
    color: null,
    id,
    imageUrl: null,
    linkedinUrl: null,
    name,
    teamRole: "Team Member",
  };
}

describe("KnightHacks IX team roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes Lena only from the featured designers", async () => {
    const officer = member("executive-officer", "Officer");
    const director = member("directors-director", "Director");
    const organizer = member("hackathon-organizer", "Organizer");
    const firstFeaturedDesigner = member(
      "design-f06cbff5-b5f8-49d5-8a3c-5b40a59dfcc6",
      "Featured Designer One",
    );
    const lena = member(
      "design-3a0d6777-2276-4ae8-9281-ace2a26d6c94",
      "Lena Tran",
    );
    const secondFeaturedDesigner = member(
      "design-f56f4444-7962-4090-b937-f31674a6ac7e",
      "Featured Designer Two",
    );
    const unfeaturedDesigner = member("design-other", "Other Designer");
    const signal = new AbortController().signal;

    mocks.query.mockResolvedValue({
      members: {
        design: [
          firstFeaturedDesigner,
          lena,
          secondFeaturedDesigner,
          unfeaturedDesigner,
        ],
        directors: [director],
        executive: [officer],
        hackathon: [organizer],
      },
      teams: [],
    });

    const groups = await loadTeamCascadeGroups(
      "https://blade.example.test",
      signal,
    );

    expect(groups).toEqual([
      { members: [officer], roleLabel: "Officer" },
      { members: [director], roleLabel: "Director" },
      { members: [organizer], roleLabel: "Organizer" },
      {
        members: [firstFeaturedDesigner, secondFeaturedDesigner],
        roleLabel: "Designer",
      },
    ]);
    expect(mocks.query).toHaveBeenCalledWith(undefined, { signal });
  });
});
