import type { RouterInputs } from "@forge/api";
import { ISSUE } from "@forge/consts";

/**
 * The unsaved shape of the "create issue" form. `creationKey` is minted once per
 * draft and travels with it into the mutation, so a resumed draft still
 * de-duplicates against a creation that already landed.
 */
export interface IssueDraft {
  assigneeIds: string[];
  children: NonNullable<RouterInputs["issues"]["create"]["children"]>;
  creationKey: string;
  description: string;
  dueDate: string;
  dueTime: string;
  eventId: string;
  eventMode: "create" | "link" | "none";
  links: string;
  name: string;
  parentId: string;
  priority: (typeof ISSUE.PRIORITY)[number];
  status: (typeof ISSUE.ISSUE_STATUS)[number];
  team: string;
  teamVisibilityIds: string[];
  templateInput: string;
  templateId: string;
}

export function emptyDraft(team = ""): IssueDraft {
  return {
    assigneeIds: [],
    children: [],
    creationKey: crypto.randomUUID(),
    description: "",
    dueDate: "",
    dueTime: ISSUE.TASK_DUE_TIME,
    eventId: "",
    eventMode: "none",
    links: "",
    name: "",
    parentId: "",
    priority: "Medium",
    status: "Backlog",
    team,
    teamVisibilityIds: [],
    templateId: "",
    templateInput: "",
  };
}

/**
 * The external-links textarea is one URL per line. Blank lines and stray
 * whitespace are the normal cost of pasting, so they are dropped rather than
 * sent to the validator as empty strings.
 */
export function parseDraftLinks(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
