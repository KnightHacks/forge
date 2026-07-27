import { describe, expect, it } from "vitest";

import { createResumeBundlePlan } from "../../utils/resume/bundle";

describe("createResumeBundlePlan", () => {
  it("organizes every resume by all, graduation term, university, and major", () => {
    const [entry] = createResumeBundlePlan([
      {
        firstName: "Ada",
        gradDate: "2027-12-10",
        id: "member-1",
        lastName: "Lovelace",
        major: "Computer Science",
        school: "University of Central Florida",
      },
    ]);

    expect(entry).toEqual({
      fileName: "Ada_Lovelace_Fall_2027.pdf",
      memberId: "member-1",
      paths: [
        "All/Ada_Lovelace_Fall_2027.pdf",
        "Grad Term/Fall 2027/Ada_Lovelace_Fall_2027.pdf",
        "University/University of Central Florida/Ada_Lovelace_Fall_2027.pdf",
        "Major/Computer Science/Ada_Lovelace_Fall_2027.pdf",
      ],
    });
  });

  it("separates matching graduation terms from different years", () => {
    const plan = createResumeBundlePlan([
      {
        firstName: "Ada",
        gradDate: "2027-12-10",
        id: "member-1",
        lastName: "Lovelace",
        major: "Computer Science",
        school: "University of Central Florida",
      },
      {
        firstName: "Grace",
        gradDate: "2028-12-10",
        id: "member-2",
        lastName: "Hopper",
        major: "Computer Science",
        school: "University of Central Florida",
      },
    ]);

    expect(plan.map((entry) => entry.paths[1])).toEqual([
      "Grad Term/Fall 2027/Ada_Lovelace_Fall_2027.pdf",
      "Grad Term/Fall 2028/Grace_Hopper_Fall_2028.pdf",
    ]);
  });

  it("sanitizes archive traversal and keeps colliding names distinct", () => {
    const plan = createResumeBundlePlan([
      {
        firstName: "../Ada",
        gradDate: "2027-12-10",
        id: "member-1",
        lastName: "Lovelace",
        major: "../Computer/Science",
        school: "UCF/Orlando",
      },
      {
        firstName: "../Ada",
        gradDate: "2027-12-10",
        id: "member-2",
        lastName: "Lovelace",
        major: "../Computer/Science",
        school: "UCF/Orlando",
      },
    ]);

    expect(plan[0]?.fileName).toBe("-Ada_Lovelace_Fall_2027.pdf");
    expect(plan[1]?.fileName).toBe("-Ada_Lovelace_Fall_2027_2.pdf");
    expect(plan.flatMap((entry) => entry.paths).join("\n")).not.toContain(
      "../",
    );
    expect(plan[0]?.paths[2]).toContain("University/UCF-Orlando/");
    expect(plan[0]?.paths[3]).toContain("Major/-Computer-Science/");
  });
});
