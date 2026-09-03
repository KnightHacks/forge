import { describe, expect, it } from "vitest";

import {
  parseDevpostProjects,
  ProjectImportError,
} from "../../utils/projects/devpost-import";

function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

const headers = [
  "Opt-In Prize",
  "Project Title",
  "Submission Url",
  "Project Status",
  "Project Created At",
  "Project Submitted At",
  "About The Project",
  '"Try it out" Links',
  "Video Demo Link",
  "Built With",
  "Submitter First Name",
  "Submitter Last Name",
  "Submitter Email",
  "Team Colleges/Universities",
  "Additional Team Member Count",
  "Team Member 1 First Name",
  "Team Member 1 Last Name",
  "Team Member 1 Email",
  "...",
];

function projectRow(
  overrides: Partial<Record<(typeof headers)[number], string>> = {},
  extraMembers: string[] = [],
) {
  const values: Record<string, string> = {
    "About The Project": "# A useful project\n\nBuilt safely.",
    "Additional Team Member Count": "1",
    "Built With": "TypeScript, Postgres",
    "Opt-In Prize": "NVIDIA",
    "Project Created At": "2026-08-29 12:00:00",
    "Project Status": "Submitted (Gallery/Visible)",
    "Project Submitted At": "2026-08-30 10:00:00",
    "Project Title": "Signal Forge",
    "Submission Url": " https://signal-forge.devpost.com/ ",
    "Submitter Email": "captain@example.test",
    "Submitter First Name": "Casey",
    "Submitter Last Name": "Captain",
    "Team Colleges/Universities": "UCF",
    "Team Member 1 Email": "member@example.test",
    "Team Member 1 First Name": "Morgan",
    "Team Member 1 Last Name": "Maker",
    '"Try it out" Links': "https://example.test/demo",
    "Video Demo Link": "https://example.test/video",
    ...overrides,
  };
  return [
    ...headers.slice(0, -1).map((header) => values[header] ?? ""),
    ...extraMembers,
  ];
}

describe("Devpost project import parsing", () => {
  it("groups repeated URLs into one project and derives exact challenges", () => {
    const input = csv([
      headers,
      projectRow(),
      projectRow({ "Opt-In Prize": " nvidia " }),
      projectRow({ "Opt-In Prize": "General" }),
    ]);

    const result = parseDevpostProjects(input);

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      participantCount: 2,
      prizeCategories: ["General", "NVIDIA", "nvidia"],
      submissionUrl: "https://signal-forge.devpost.com/",
      title: "Signal Forge",
    });
    expect(result.projects[0]?.members).toEqual([
      { email: "captain@example.test", name: "Casey Captain", order: 0 },
      { email: "member@example.test", name: "Morgan Maker", order: 1 },
    ]);
    expect(result.challengeLabels).toEqual(["General", "NVIDIA", "nvidia"]);
    expect(result.counts.collapsedDuplicateRows).toBe(2);
  });

  it("imports valid submitted projects while rejecting drafts and conflicts", () => {
    const input = csv([
      headers,
      projectRow(),
      projectRow({
        "Project Status": "Draft",
        "Project Title": "Draft only",
        "Submission Url": "https://draft.devpost.com/",
      }),
      projectRow({
        "Project Title": "Conflict one",
        "Submission Url": "https://conflict.devpost.com/",
      }),
      projectRow({
        "Project Title": "Conflict two",
        "Submission Url": "https://conflict.devpost.com/",
      }),
    ]);

    const result = parseDevpostProjects(input);

    expect(result.projects).toHaveLength(1);
    expect(result.counts.excludedDraftProjects).toBe(1);
    expect(result.counts.rejectedProjects).toBe(1);
    expect(result.rejections[0]?.reason).toContain("conflicting");
    expect(JSON.stringify(result.rejections)).not.toContain("captain@example");
  });

  it("rejects duplicate URLs with conflicting submitter names", () => {
    const result = parseDevpostProjects(
      csv([
        headers,
        projectRow({
          "Project Title": "Valid project",
          "Submission Url": "https://valid.devpost.com/",
        }),
        projectRow({ "Submission Url": "https://conflict.devpost.com/" }),
        projectRow({
          "Submission Url": "https://conflict.devpost.com/",
          "Submitter First Name": "Different",
        }),
      ]),
    );

    expect(result.counts.rejectedProjects).toBe(1);
    expect(result.rejections[0]?.reason).toContain("conflicting");
  });

  it("rejects duplicate URLs with conflicting team data", () => {
    const result = parseDevpostProjects(
      csv([
        headers,
        projectRow({
          "Project Title": "Valid project",
          "Submission Url": "https://valid.devpost.com/",
        }),
        projectRow({ "Submission Url": "https://conflict.devpost.com/" }),
        projectRow({
          "Submission Url": "https://conflict.devpost.com/",
          "Team Member 1 Email": "different@example.test",
        }),
      ]),
    );

    expect(result.counts.rejectedProjects).toBe(1);
    expect(result.rejections[0]?.reason).toContain("conflicting");
  });

  it("ignores questionnaire cells after the declared member triples", () => {
    const result = parseDevpostProjects(
      csv([
        headers,
        projectRow({}, ["first questionnaire response"]),
        projectRow({}, ["different questionnaire response"]),
      ]),
    );

    expect(result.projects).toHaveLength(1);
    expect(result.counts.collapsedDuplicateRows).toBe(1);
    expect(result.counts.rejectedProjects).toBe(0);
  });

  it("counts malformed draft URLs as excluded instead of rejected", () => {
    const result = parseDevpostProjects(
      csv([
        headers,
        projectRow(),
        projectRow({
          "Project Status": "Draft",
          "Project Title": "Malformed draft",
          "Submission Url": "not a URL",
        }),
      ]),
    );

    expect(result.counts.excludedDraftProjects).toBe(1);
    expect(result.counts.rejectedProjects).toBe(0);
  });

  it("reads variable-width member triples and keeps declared count independent", () => {
    const input = csv([
      headers,
      projectRow({ "Additional Team Member Count": "3" }, [
        "Taylor",
        "Tester",
        "taylor@example.test",
        "Riley",
        "Researcher",
        "riley@example.test",
      ]),
    ]);

    const result = parseDevpostProjects(input);

    expect(result.projects[0]?.participantCount).toBe(4);
    expect(result.projects[0]?.members.map((member) => member.name)).toEqual([
      "Casey Captain",
      "Morgan Maker",
      "Taylor Tester",
      "Riley Researcher",
    ]);
  });

  it("rejects structurally invalid files before replacement", () => {
    expect(() => parseDevpostProjects("Project Title\nOnly a title")).toThrow(
      ProjectImportError,
    );
    expect(() => parseDevpostProjects(csv([headers]))).toThrow(
      "no project rows",
    );
  });

  it("imports projects when the description is blank or omitted", () => {
    const blank = parseDevpostProjects(
      csv([headers, projectRow({ "About The Project": "" })]),
    );
    expect(blank.projects[0]?.description).toBe("");

    const descriptionIndex = headers.indexOf("About The Project");
    const headersWithoutDescription = headers.filter(
      (_, index) => index !== descriptionIndex,
    );
    const rowWithoutDescription = projectRow().filter(
      (_, index) => index !== descriptionIndex,
    );
    const omitted = parseDevpostProjects(
      csv([headersWithoutDescription, rowWithoutDescription]),
    );
    expect(omitted.projects[0]?.description).toBe("");
  });

  it("imports projects when technologies and schools are blank or omitted", () => {
    const blank = parseDevpostProjects(
      csv([
        headers,
        projectRow({
          "Built With": "",
          "Team Colleges/Universities": "",
        }),
      ]),
    );
    expect(blank.projects[0]).toMatchObject({
      technologies: [],
      universities: [],
    });

    const optionalHeaders = new Set([
      "Built With",
      "Team Colleges/Universities",
    ]);
    const headersWithoutOptionalFields = headers.filter(
      (header) => !optionalHeaders.has(header),
    );
    const rowWithoutOptionalFields = projectRow().filter(
      (_, index) => !optionalHeaders.has(headers[index] ?? ""),
    );
    const omitted = parseDevpostProjects(
      csv([headersWithoutOptionalFields, rowWithoutOptionalFields]),
    );
    expect(omitted.projects[0]).toMatchObject({
      technologies: [],
      universities: [],
    });
  });

  it("imports projects when the opt-in prize column is omitted", () => {
    const prizeIndex = headers.indexOf("Opt-In Prize");
    const headersWithoutPrize = headers.filter(
      (_, index) => index !== prizeIndex,
    );
    const rowWithoutPrize = projectRow().filter(
      (_, index) => index !== prizeIndex,
    );

    const result = parseDevpostProjects(
      csv([headersWithoutPrize, rowWithoutPrize]),
    );

    expect(result.projects[0]?.prizeCategories).toEqual([]);
    expect(result.challengeLabels).toEqual(["General"]);
  });
});
