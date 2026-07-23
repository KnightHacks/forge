export interface LegacyIssueRecord {
  eventId?: string | null;
  id: string;
  parentId: string | null;
  teamId: string;
}

export interface LegacyTemplateRecord {
  body: unknown;
  id: string;
  name: string;
}

export type BlockingIssueCode =
  | "CROSS_TEAM_PARENT"
  | "CYCLE"
  | "DEPTH_EXCEEDED"
  | "INVALID_ASSIGNEE"
  | "INVALID_EVENT"
  | "INVALID_REMINDER_CHANNEL"
  | "MISSING_OWNING_ROLE"
  | "MISSING_PARENT"
  | "MISSING_VISIBILITY_ROLE";

export interface LegacyIssueAssignment {
  issueId: string;
  userId: string;
}

export interface LegacyIssueVisibility {
  issueId: string;
  teamId: string;
}

export interface LegacyRoleAssignment {
  roleId: string;
  userId: string;
}

export interface LegacyReminderDestination {
  channelId: string;
  roleId: string;
}

export interface IssueIntegrityReport {
  blockingIssues: {
    code: BlockingIssueCode;
    issueId: string;
    message: string;
  }[];
  canEnable: boolean;
  templatesToDisable: { id: string; reason: string }[];
}

function normalizedTemplateName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function templateProblem(body: unknown, depth = 1): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Template body is not an object.";
  }
  if (depth > 5) return "Template exceeds the five-level depth limit.";
  const record = body as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return "Template issue name is missing.";
  }
  for (const value of [record.name, record.description]) {
    if (typeof value !== "string") continue;
    for (const match of value.matchAll(/\{([^{}]+)\}/g)) {
      if (match[1] !== "INPUT" && match[1] !== "PARENT") {
        return `Unsupported template token {${match[1]}}.`;
      }
    }
  }
  if (record.children === undefined) return null;
  if (!Array.isArray(record.children))
    return "Template children must be an array.";
  for (const child of record.children) {
    const problem = templateProblem(child, depth + 1);
    if (problem) return problem;
  }
  return null;
}

export function inspectIssueIntegrity({
  assignments = [],
  eventIds,
  issues,
  reminderDestinations = [],
  roleAssignments = [],
  roleIds,
  templates,
  userIds,
  visibility = [],
}: {
  assignments?: readonly LegacyIssueAssignment[];
  eventIds?: readonly string[];
  issues: readonly LegacyIssueRecord[];
  reminderDestinations?: readonly LegacyReminderDestination[];
  roleAssignments?: readonly LegacyRoleAssignment[];
  roleIds?: readonly string[];
  templates: readonly LegacyTemplateRecord[];
  userIds?: readonly string[];
  visibility?: readonly LegacyIssueVisibility[];
}): IssueIntegrityReport {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const knownEventIds = new Set(eventIds ?? []);
  const knownRoleIds = new Set(roleIds ?? []);
  const knownUserIds = new Set(userIds ?? []);
  const assignedRoleUsers = new Set(
    roleAssignments.map(({ roleId, userId }) => `${roleId}:${userId}`),
  );
  const blockingIssues: IssueIntegrityReport["blockingIssues"] = [];
  const seen = new Set<string>();
  const addBlocking = (
    code: BlockingIssueCode,
    issueId: string,
    message: string,
  ) => {
    const key = `${code}:${issueId}`;
    if (seen.has(key)) return;
    seen.add(key);
    blockingIssues.push({ code, issueId, message });
  };

  for (const issue of issues) {
    if (roleIds !== undefined && !knownRoleIds.has(issue.teamId)) {
      addBlocking(
        "MISSING_OWNING_ROLE",
        issue.id,
        `Owning role ${issue.teamId} does not exist.`,
      );
    }
    if (
      issue.eventId &&
      eventIds !== undefined &&
      !knownEventIds.has(issue.eventId)
    ) {
      addBlocking(
        "INVALID_EVENT",
        issue.id,
        `Linked Club event ${issue.eventId} does not exist.`,
      );
    }
    if (!issue.parentId) continue;
    const parent = byId.get(issue.parentId);
    if (!parent) {
      addBlocking("MISSING_PARENT", issue.id, "Parent issue does not exist.");
    } else if (parent.teamId !== issue.teamId) {
      addBlocking(
        "CROSS_TEAM_PARENT",
        issue.id,
        "Parent and child belong to different teams.",
      );
    }
  }

  for (const entry of visibility) {
    if (!byId.has(entry.issueId) || !knownRoleIds.has(entry.teamId)) {
      addBlocking(
        "MISSING_VISIBILITY_ROLE",
        entry.issueId,
        `Visibility role ${entry.teamId} or its issue does not exist.`,
      );
    }
  }

  for (const assignment of assignments) {
    const issue = byId.get(assignment.issueId);
    if (
      !issue ||
      !knownUserIds.has(assignment.userId) ||
      !assignedRoleUsers.has(`${issue.teamId}:${assignment.userId}`)
    ) {
      addBlocking(
        "INVALID_ASSIGNEE",
        assignment.issueId,
        `Assignee ${assignment.userId} is missing or does not belong to the owning role.`,
      );
    }
  }

  for (const destination of reminderDestinations) {
    if (!/^\d{17,20}$/.test(destination.channelId)) {
      addBlocking(
        "INVALID_REMINDER_CHANNEL",
        destination.roleId,
        `Reminder destination ${destination.channelId || "(empty)"} is not a Discord channel ID.`,
      );
    }
  }

  for (const issue of issues) {
    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: LegacyIssueRecord | undefined = issue;
    while (current) {
      const priorPosition = positions.get(current.id);
      if (priorPosition !== undefined) {
        for (const cycleId of path.slice(priorPosition)) {
          addBlocking("CYCLE", cycleId, "Issue hierarchy contains a cycle.");
        }
        break;
      }
      positions.set(current.id, path.length);
      path.push(current.id);
      if (path.length > 5) {
        addBlocking(
          "DEPTH_EXCEEDED",
          issue.id,
          "Issue hierarchy exceeds five levels.",
        );
        break;
      }
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }

  const templatesToDisable = new Map<string, string>();
  const idsByName = new Map<string, string[]>();
  for (const template of templates) {
    const name = normalizedTemplateName(template.name);
    idsByName.set(name, [...(idsByName.get(name) ?? []), template.id]);
    const problem = templateProblem(template.body);
    if (problem) templatesToDisable.set(template.id, problem);
  }
  for (const [name, ids] of idsByName) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      templatesToDisable.set(
        id,
        `Duplicate normalized template name "${name}" requires repair.`,
      );
    }
  }

  return {
    blockingIssues,
    canEnable: blockingIssues.length === 0,
    templatesToDisable: [...templatesToDisable].map(([id, reason]) => ({
      id,
      reason,
    })),
  };
}
