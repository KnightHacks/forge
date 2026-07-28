import type { RouterOutputs } from "@forge/api";

export type IssueWorkspaceItem =
  RouterOutputs["issues"]["list"]["rows"][number];
export type IssueAssigneeChoice =
  RouterOutputs["issues"]["listAssignees"][number];
export type IssueEventChoice = RouterOutputs["issues"]["listEvents"][number];
export type IssueTeamChoice = RouterOutputs["issues"]["listTeams"][number];
export type IssueTemplateChoice =
  RouterOutputs["issues"]["listTemplates"][number];

export interface IssueWorkspaceData {
  counts: RouterOutputs["issues"]["list"]["counts"];
  issues: IssueWorkspaceItem[];
  pagination: RouterOutputs["issues"]["list"]["pagination"];
  teams: IssueTeamChoice[];
  templates: IssueTemplateChoice[];
}
