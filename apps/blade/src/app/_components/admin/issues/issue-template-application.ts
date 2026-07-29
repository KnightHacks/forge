import { defaultIssueDueAt } from "@forge/validators";

import type { IssueDraft } from "./issue-draft";
import { clubDateKey, clubWallClock } from "~/lib/dates";

/**
 * The stored shape of an issue template body. Structurally the same node the
 * API validates as `IssueTemplateNode` in `@forge/validators`; kept local
 * because the workspace reads it off an already-persisted `unknown` column.
 */
export interface TemplateBody {
  assigneeIds?: string[];
  children?: TemplateBody[];
  description: string;
  name: string;
  priority: IssueDraft["priority"];
  relativeDueDays?: number;
  status: IssueDraft["status"];
  team: string;
  teamVisibilityIds?: string[];
}

/**
 * A template's due date is relative to the club-time day the template is
 * applied, anchored at noon UTC so the offset cannot land on a neighbouring day.
 */
export function relativeTemplateDueAt(days: number | undefined) {
  if (days === undefined) return undefined;
  const date = new Date(`${clubDateKey()}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return defaultIssueDueAt(date.toISOString().slice(0, 10));
}

function easternDueParts(iso: string) {
  const { date, time } = clubWallClock(iso);
  return { date, time };
}

export function replaceTemplateTokens(
  value: string,
  input: string,
  parent: string,
) {
  return value.replaceAll("{INPUT}", input).replaceAll("{PARENT}", parent);
}

/**
 * `{PARENT}` resolves to the immediate parent's already-substituted name, so a
 * grandchild sees its own parent rather than the template root.
 */
export function materializeTemplateChildren(
  nodes: TemplateBody[],
  options: { input: string; parentName: string; team: string },
): IssueDraft["children"] {
  return nodes.map((node) => {
    const name = replaceTemplateTokens(
      node.name,
      options.input,
      options.parentName,
    );
    return {
      assigneeIds: node.assigneeIds ?? [],
      children: materializeTemplateChildren(node.children ?? [], {
        ...options,
        parentName: name,
      }),
      description: replaceTemplateTokens(
        node.description,
        options.input,
        options.parentName,
      ),
      dueAt: relativeTemplateDueAt(node.relativeDueDays),
      eventId: undefined,
      links: [],
      name,
      priority: node.priority,
      status: node.status,
      team: options.team,
      teamVisibilityIds: node.teamVisibilityIds ?? [],
    };
  });
}

/** True when any node anywhere in the tree still needs the template value. */
export function templateNeedsInput(body: TemplateBody) {
  return JSON.stringify(body).includes("{INPUT}");
}

/**
 * The root node overwrites its draft fields; the optional ones fall back to
 * whatever the draft already carried, so applying a template that names no
 * assignees does not clear the ones already chosen.
 */
export function applyTemplateToDraft(
  current: IssueDraft,
  options: {
    body: TemplateBody;
    input: string;
    rootDueAt: string | undefined;
    team: string;
  },
): IssueDraft {
  const { body, input, rootDueAt, team } = options;
  const rootDue = rootDueAt ? easternDueParts(rootDueAt) : null;
  const rootName = replaceTemplateTokens(body.name, input, "");
  return {
    ...current,
    assigneeIds: body.assigneeIds ?? current.assigneeIds,
    children: materializeTemplateChildren(body.children ?? [], {
      input,
      parentName: rootName,
      team,
    }),
    description: replaceTemplateTokens(body.description, input, ""),
    dueDate: rootDue?.date ?? current.dueDate,
    dueTime: rootDue?.time ?? current.dueTime,
    name: rootName,
    priority: body.priority,
    status: body.status,
    team,
    teamVisibilityIds: body.teamVisibilityIds ?? current.teamVisibilityIds,
  };
}
