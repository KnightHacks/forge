import { describe, expect, it } from "vitest";

import { hackathons } from "@forge/utils";

describe("getClassTeam", () => {
  it("should return Monstrosity team for Harbinger class", () => {
    const result = hackathons.getClassTeam("Harbinger");
    expect(result).toEqual({
      team: "Monstrosity",
      teamColor: "#e03131",
      imgUrl: "/khviii/lenneth.jpg",
    });
  });

  it("should return Monstrosity team for Alchemist class", () => {
    const result = hackathons.getClassTeam("Alchemist");
    expect(result).toEqual({
      team: "Monstrosity",
      teamColor: "#e03131",
      imgUrl: "/khviii/lenneth.jpg",
    });
  });

  it("should return Monstrosity team for Monstologist class", () => {
    const result = hackathons.getClassTeam("Monstologist");
    expect(result).toEqual({
      team: "Monstrosity",
      teamColor: "#e03131",
      imgUrl: "/khviii/lenneth.jpg",
    });
  });

  it("should return Humanity team for other classes", () => {
    const result = hackathons.getClassTeam("Humanity" as any);
    expect(result).toEqual({
      team: "Humanity",
      teamColor: "#228be6",
      imgUrl: "/khviii/tkhero.jpg",
    });
  });

  it("should return Humanity team for unknown class", () => {
    const result = hackathons.getClassTeam("UnknownClass" as any);
    expect(result).toEqual({
      team: "Humanity",
      teamColor: "#228be6",
      imgUrl: "/khviii/tkhero.jpg",
    });
  });
});
