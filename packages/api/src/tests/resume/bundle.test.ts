import { describe, expect, it } from "vitest";

import {
  createResumeBundleParts,
  createResumeBundlePlan,
  sortResumeBundleCandidates,
} from "../../utils/resume/bundle";

describe("createResumeBundleParts", () => {
  it("creates deterministic bounded parts without dropping source PDFs", () => {
    const plan = Array.from({ length: 251 }, (_, index) => ({
      fileName: `${index}.pdf`,
      memberId: String(index),
      paths: [`00 All resumes/${index}.pdf`],
    }));
    const parts = createResumeBundleParts(
      plan,
      Array.from({ length: plan.length }, () => 1024),
    );

    expect(parts.map((part) => part.sourceCount)).toEqual([250, 1]);
    expect(parts.flatMap((part) => part.indexes)).toEqual(
      Array.from({ length: 251 }, (_, index) => index),
    );
  });
});

describe("createResumeBundlePlan", () => {
  it("uses the America/New_York calendar day for recruiting horizons", () => {
    const [entry] = createResumeBundlePlan(
      [
        {
          firstName: "Ada",
          gradDate: "2027-05-01",
          id: "member-1",
          lastName: "Lovelace",
          major: "Computer Science",
          school: "University of Central Florida",
        },
      ],
      new Date("2027-05-02T03:30:00Z"),
    );

    expect(entry?.paths[1]).toContain(
      "01 Recruiting horizon/Graduating within 12 months/",
    );
  });

  it("sorts preview and download candidates by normalized name and profile identity", () => {
    const rows = [
      {
        firstName: "Ada",
        gradDate: "2027-05-01",
        id: "attendee-1",
        lastName: "Love\u006cace",
        profileId: "profile-2",
      },
      {
        firstName: "Ada",
        gradDate: "2028-05-01",
        id: "attendee-2",
        lastName: "Lovelace",
        profileId: "profile-1",
      },
    ];

    expect(sortResumeBundleCandidates(rows).map((row) => row.id)).toEqual([
      "attendee-2",
      "attendee-1",
    ]);
  });

  it("organizes every resume by all, graduation term, university, and major", () => {
    const [entry] = createResumeBundlePlan(
      [
        {
          firstName: "Ada",
          gradDate: "2027-12-10",
          id: "member-1",
          lastName: "Lovelace",
          major: "Computer Science",
          school: "University of Central Florida",
        },
      ],
      new Date("2026-08-06T12:00:00Z"),
    );

    expect(entry).toEqual({
      fileName: "Lovelace_Ada_Fall_2027.pdf",
      memberId: "member-1",
      paths: [
        "00 All resumes/Lovelace_Ada_Fall_2027.pdf",
        "01 Recruiting horizon/Graduating in 13-24 months/Lovelace_Ada_Fall_2027.pdf",
        "02 Graduation term/Fall 2027/Lovelace_Ada_Fall_2027.pdf",
        "03 Inferred academic year/Unknown/Lovelace_Ada_Fall_2027.pdf",
        "04 Level of study/Unknown/Lovelace_Ada_Fall_2027.pdf",
        "05 Major/Computer Science/Lovelace_Ada_Fall_2027.pdf",
        "06 University/University of Central Florida/Lovelace_Ada_Fall_2027.pdf",
        "07 Demographics/Age band/Unknown/Lovelace_Ada_Fall_2027.pdf",
        "07 Demographics/Gender/Unknown/Lovelace_Ada_Fall_2027.pdf",
        "07 Demographics/Race or ethnicity/Unknown/Lovelace_Ada_Fall_2027.pdf",
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

    expect(plan.map((entry) => entry.paths[2])).toEqual([
      "02 Graduation term/Fall 2027/Lovelace_Ada_Fall_2027.pdf",
      "02 Graduation term/Fall 2028/Hopper_Grace_Fall_2028.pdf",
    ]);
  });

  it("adds independent recruiter indexes without creating intersections", () => {
    const [entry] = createResumeBundlePlan([
      {
        firstName: "Ada",
        gender: "Woman",
        gradDate: "2027-12-10",
        id: "hacker-1",
        inferredYearOfStudy: "Junior (inferred)",
        lastName: "Lovelace",
        levelOfStudy: "Undergraduate University (3+ year)",
        major: "Computer Science",
        raceOrEthnicity: "White",
        school: "University of Central Florida",
      },
    ]);
    expect(entry?.paths).toEqual(
      expect.arrayContaining([
        expect.stringContaining("03 Inferred academic year/Junior (inferred)/"),
        expect.stringContaining("04 Level of study/Undergraduate University"),
        expect.stringContaining("07 Demographics/Gender/Woman/"),
        expect.stringContaining("07 Demographics/Race or ethnicity/White/"),
      ]),
    );
    expect(entry?.paths.join("\n")).not.toContain("Woman/White");
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

    expect(plan[0]?.fileName).toBe("Lovelace_-Ada_Fall_2027.pdf");
    expect(plan[1]?.fileName).toBe("Lovelace_-Ada_Fall_2027_2.pdf");
    expect(plan.flatMap((entry) => entry.paths).join("\n")).not.toContain(
      "../",
    );
    expect(plan[0]?.paths[6]).toContain("06 University/UCF-Orlando/");
    expect(plan[0]?.paths[5]).toContain("05 Major/-Computer-Science/");
  });
});
