import type { TeamPerformanceReportInput } from "@forge/validators";
import { teamPerformanceReportInputSchema } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { first } from "~/lib/search-params";
import {
  appendAnalyticsPeriodSearchParams,
  parseAnalyticsPeriodSearchParams,
} from "./params";

export const teamPerformanceRankFields = [
  "issues",
  "messages",
  "current-streak",
  "longest-streak",
  "events",
] as const;

export type TeamPerformanceRankField =
  (typeof teamPerformanceRankFields)[number];

function parseRankField(value: string | undefined): TeamPerformanceRankField {
  return teamPerformanceRankFields.includes(value as TeamPerformanceRankField)
    ? (value as TeamPerformanceRankField)
    : "issues";
}

export function parseTeamPerformanceSearchParams(
  params: SearchParams,
  defaultTeamSlug: string,
) {
  const parsed = teamPerformanceReportInputSchema.safeParse({
    period: parseAnalyticsPeriodSearchParams(params),
    teamSlug: first(params.team) ?? defaultTeamSlug,
  });
  return {
    input: parsed.success
      ? parsed.data
      : teamPerformanceReportInputSchema.parse({ teamSlug: defaultTeamSlug }),
    rankBy: parseRankField(first(params.rank)),
  };
}

export function buildTeamPerformanceSearchParams(
  input: TeamPerformanceReportInput,
  rankBy: TeamPerformanceRankField,
) {
  const params = new URLSearchParams({ scope: "team", team: input.teamSlug });
  if (rankBy !== "issues") params.set("rank", rankBy);
  appendAnalyticsPeriodSearchParams(params, input.period);
  return params;
}
