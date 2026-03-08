import { describe, expect, it } from "vitest";

import { events } from "@forge/utils";

describe("getTagColor", () => {
  it("should return correct color for GBM tag", () => {
    const result = events.getTagColor("GBM");
    expect(result).toBe("bg-blue-100 text-blue-800");
  });

  it("should return correct color for Social tag", () => {
    const result = events.getTagColor("Social");
    expect(result).toBe("bg-pink-100 text-pink-800");
  });

  it("should return correct color for Hackathon tag", () => {
    const result = events.getTagColor("Hackathon");
    expect(result).toBe("bg-violet-100 text-violet-800");
  });

  it("should return correct color for Workshop tag", () => {
    const result = events.getTagColor("Workshop");
    expect(result).toBe("bg-teal-100 text-teal-800");
  });

  it("should return correct color for all valid tags", () => {
    const tags = [
      "GBM",
      "Social",
      "Kickstart",
      "Project Launch",
      "Hello World",
      "Sponsorship",
      "Tech Exploration",
      "Class Support",
      "Workshop",
      "OPS",
      "Hackathon",
      "Collabs",
      "Check-in",
      "Ceremony",
      "Merch",
      "Food",
      "CAREER-FAIR",
      "RSO-FAIR",
    ] as const;

    for (const tag of tags) {
      const result = events.getTagColor(tag);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toContain("bg-");
      expect(result).toContain("text-");
    }
  });
});
