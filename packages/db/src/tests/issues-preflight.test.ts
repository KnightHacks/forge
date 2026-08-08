import { describe, expect, it } from "vitest";

import { inspectIssueIntegrity } from "../issues/preflight";

describe("Club Operations Issues integrity preflight", () => {
  it("TC-MIGRATION-001 blocks malformed hierarchy and preserves repairable templates", () => {
    const report = inspectIssueIntegrity({
      issues: [
        { id: "a", parentId: null, teamId: "team-a" },
        { id: "b", parentId: "a", teamId: "team-b" },
        { id: "c", parentId: "missing", teamId: "team-a" },
        { id: "d", parentId: "e", teamId: "team-a" },
        { id: "e", parentId: "d", teamId: "team-a" },
      ],
      templates: [
        {
          body: { name: "Good", children: [] },
          id: "template-a",
          name: "Launch",
        },
        { body: { name: "Bad {UNKNOWN}" }, id: "template-b", name: " launch " },
      ],
    });

    expect(report.canEnable).toBe(false);
    expect(report.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CROSS_TEAM_PARENT", issueId: "b" }),
        expect.objectContaining({ code: "MISSING_PARENT", issueId: "c" }),
        expect.objectContaining({ code: "CYCLE", issueId: "d" }),
      ]),
    );
    const templateA = report.templatesToDisable.find(
      (template) => template.id === "template-a",
    );
    const templateB = report.templatesToDisable.find(
      (template) => template.id === "template-b",
    );
    expect(templateA?.reason).toContain("Duplicate");
    expect(templateB?.reason).toContain("Duplicate");
  });

  it("TC-MIGRATION-002 reports excessive legacy depth without mutating input", () => {
    const issues = Array.from({ length: 6 }, (_, index) => ({
      id: `issue-${index}`,
      parentId: index === 0 ? null : `issue-${index - 1}`,
      teamId: "team-a",
    }));
    const snapshot = structuredClone(issues);
    const report = inspectIssueIntegrity({ issues, templates: [] });

    expect(report.blockingIssues).toContainEqual(
      expect.objectContaining({ code: "DEPTH_EXCEEDED", issueId: "issue-5" }),
    );
    expect(issues).toEqual(snapshot);
  });

  it("TC-MIG-001 reports invalid roles, assignments, events, visibility, and reminder destinations", () => {
    const report = inspectIssueIntegrity({
      assignments: [
        { issueId: "issue-a", userId: "outside-user" },
        { issueId: "missing-issue", userId: "user-a" },
      ],
      eventIds: ["event-a"],
      issues: [
        {
          eventId: "missing-event",
          id: "issue-a",
          parentId: null,
          teamId: "team-a",
        },
        {
          id: "issue-b",
          parentId: null,
          teamId: "missing-team",
        },
      ],
      reminderDestinations: [{ channelId: "not-a-channel", roleId: "team-a" }],
      roleAssignments: [{ roleId: "team-a", userId: "user-a" }],
      roleIds: ["team-a"],
      templates: [],
      userIds: ["user-a", "outside-user"],
      visibility: [{ issueId: "issue-a", teamId: "missing-team" }],
    });

    expect(report.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "INVALID_ASSIGNEE",
        "INVALID_EVENT",
        "INVALID_REMINDER_CHANNEL",
        "MISSING_OWNING_ROLE",
        "MISSING_VISIBILITY_ROLE",
      ]),
    );
    expect(report.canEnable).toBe(false);
  });

  it("preserves historical ownership when a finished issue assignee has left the team", () => {
    const report = inspectIssueIntegrity({
      assignments: [{ issueId: "issue-a", userId: "former-member" }],
      issues: [
        {
          id: "issue-a",
          parentId: null,
          status: "Finished",
          teamId: "team-a",
        },
      ],
      roleAssignments: [],
      roleIds: ["team-a"],
      templates: [],
      userIds: ["former-member"],
    });

    expect(report.blockingIssues).toEqual([]);
    expect(report.canEnable).toBe(true);
  });
});
