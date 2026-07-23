import { describe, expect, it } from "vitest";

import {
  defaultIssueDueAt,
  issueCreateSchema,
  issueListQuerySchema,
  issueTemplateCreateSchema,
  issueUpdateSchema,
  normalizeIssueLinks,
} from "../issues";

const TEAM_ID = "00000000-0000-4000-8000-000000000001";
const ISSUE_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";
const CREATION_KEY = "00000000-0000-4000-8000-000000000004";

function issue(overrides: Record<string, unknown> = {}) {
  return {
    assigneeIds: [USER_ID],
    creationKey: CREATION_KEY,
    description: "Coordinate the fall semester kickoff.",
    dueAt: "2026-08-14T03:00:00.000Z",
    links: ["https://example.com/brief"],
    name: "Plan fall kickoff",
    priority: "High",
    status: "Planning",
    team: TEAM_ID,
    teamVisibilityIds: [TEAM_ID],
    ...overrides,
  };
}

describe("Club Operations Issues validators", () => {
  it("TC-VALID-001 bounds required content and collection sizes", () => {
    expect(issueCreateSchema.parse(issue())).toMatchObject({
      name: "Plan fall kickoff",
      team: TEAM_ID,
    });
    expect(() => issueCreateSchema.parse(issue({ name: "" }))).toThrow();
    expect(() =>
      issueCreateSchema.parse(issue({ name: "x".repeat(201) })),
    ).toThrow();
    expect(() => issueCreateSchema.parse(issue({ description: "" }))).toThrow();
    expect(() =>
      issueCreateSchema.parse(issue({ description: "x".repeat(20_001) })),
    ).toThrow();
    expect(() =>
      issueCreateSchema.parse(
        issue({ assigneeIds: Array.from({ length: 51 }, () => USER_ID) }),
      ),
    ).toThrow();
  });

  it("TC-VALID-001 accepts only normalized unique HTTP links", () => {
    expect(
      normalizeIssueLinks([
        " HTTPS://Example.com:443/brief#today ",
        "https://example.com/brief#today",
      ]),
    ).toEqual(["https://example.com/brief#today"]);
    expect(normalizeIssueLinks(["", "   "])).toEqual([]);
    expect(
      issueCreateSchema.parse(issue({ links: ["", "   "] })).links,
    ).toEqual([]);
    expect(() => normalizeIssueLinks(["javascript:alert(1)"])).toThrow();
    expect(() => normalizeIssueLinks(["ftp://example.com/file"])).toThrow();
    expect(() =>
      normalizeIssueLinks(
        Array.from({ length: 21 }, (_, i) => `https://e.co/${i}`),
      ),
    ).toThrow();
  });

  it("TC-LIFE-001 defaults ordinary due dates to 23:00 America/New_York", () => {
    expect(defaultIssueDueAt("2026-07-21")).toBe("2026-07-22T03:00:00.000Z");
    expect(defaultIssueDueAt("2026-12-21")).toBe("2026-12-22T04:00:00.000Z");
    expect(defaultIssueDueAt("2026-07-21", "18:30")).toBe(
      "2026-07-21T22:30:00.000Z",
    );
  });

  it("TC-LIFE-003 validates revisions and distinguishes root idempotency", () => {
    expect(
      issueUpdateSchema.parse({
        description: "Updated operating plan",
        expectedRevision: 4,
        id: ISSUE_ID,
      }),
    ).toMatchObject({ expectedRevision: 4, id: ISSUE_ID });
    expect(() =>
      issueUpdateSchema.parse({ expectedRevision: 0, id: ISSUE_ID }),
    ).toThrow();
    expect(() =>
      issueCreateSchema.parse(issue({ creationKey: "not-a-key" })),
    ).toThrow();
  });

  it("TC-VALID-002 enforces a depth-five, one-hundred-node tree", () => {
    const child = (depth: number): Record<string, unknown> => ({
      assigneeIds: [USER_ID],
      description: "Coordinate the fall semester kickoff.",
      dueAt: "2026-08-14T03:00:00.000Z",
      links: [],
      name: `Nested task ${depth}`,
      priority: "High",
      status: "Planning",
      team: TEAM_ID,
      teamVisibilityIds: [TEAM_ID],
      children: depth === 0 ? [] : [level(depth - 1)],
    });
    const level = (depth: number) =>
      issue({ children: depth === 0 ? [] : [child(depth - 1)] });

    expect(issueCreateSchema.parse(level(4))).toBeDefined();
    expect(() => issueCreateSchema.parse(level(5))).toThrow();
    expect(() =>
      issueCreateSchema.parse(
        issue({
          children: Array.from({ length: 100 }, () =>
            issue({ creationKey: undefined }),
          ),
        }),
      ),
    ).toThrow();
  });

  it("TC-VALID-003 validates list and calendar query bounds", () => {
    expect(issueListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 25,
      search: "",
      statuses: [],
    });
    expect(
      issueListQuerySchema.parse({
        calendarEnd: "2026-08-31T04:00:00.000Z",
        calendarStart: "2026-07-01T04:00:00.000Z",
        view: "calendar",
      }),
    ).toBeDefined();
    expect(() => issueListQuerySchema.parse({ pageSize: 26 })).toThrow();
    expect(() =>
      issueListQuerySchema.parse({ search: "x".repeat(201) }),
    ).toThrow();
    expect(() =>
      issueListQuerySchema.parse({
        calendarEnd: "2026-10-01T04:00:00.000Z",
        calendarStart: "2026-07-01T04:00:00.000Z",
        view: "calendar",
      }),
    ).toThrow();
  });

  it("TC-TEMPLATE-002 normalizes names and validates nested placeholders", () => {
    const parsed = issueTemplateCreateSchema.parse({
      body: {
        description: "Prepare {INPUT}",
        name: "{PARENT}: launch checklist",
        priority: "Medium",
        status: "Backlog",
        team: TEAM_ID,
      },
      name: "  Fall   Launch  ",
    });
    expect(parsed.normalizedName).toBe("fall launch");
    expect(parsed.name).toBe("Fall Launch");
    expect(() =>
      issueTemplateCreateSchema.parse({
        body: { ...parsed.body, name: "Unsupported {TOKEN}" },
        name: "Launch",
      }),
    ).toThrow();
  });
});
