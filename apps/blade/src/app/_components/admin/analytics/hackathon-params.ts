import type { HackathonAnalyticsReportInput } from "@forge/validators";
import { hackathonAnalyticsReportInputSchema } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { first } from "~/lib/search-params";

function list(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseHackathonAnalyticsSearchParams(
  params: SearchParams,
  hackathonId: string,
  defaultComparisonHackathonId: string | null = null,
) {
  const requestedComparison = first(params.compareHackathon);
  const parsed = hackathonAnalyticsReportInputSchema.safeParse({
    audienceView: first(params.audienceView),
    comparisonHackathonId:
      requestedComparison === "none"
        ? null
        : (requestedComparison ?? defaultComparisonHackathonId),
    compositionCohort: first(params.audienceCohort),
    demographic: first(params.demographic),
    eventId: first(params.event) ?? null,
    eventPurpose: first(params.eventPurpose),
    eventTags: list(params.tag),
    hackathonId,
    liveWindow: first(params.liveWindow),
    section: first(params.section),
  });
  return parsed.success
    ? parsed.data
    : hackathonAnalyticsReportInputSchema.parse({ hackathonId });
}

export function buildHackathonAnalyticsSearchParams(
  input: HackathonAnalyticsReportInput,
) {
  const params = new URLSearchParams({
    hackathon: input.hackathonId,
    scope: "hackathon",
  });
  if (input.section !== "overview") params.set("section", input.section);
  if (input.audienceView !== "composition")
    params.set("audienceView", input.audienceView);
  if (input.compositionCohort !== "applicants")
    params.set("audienceCohort", input.compositionCohort);
  if (input.demographic !== "level_of_study")
    params.set("demographic", input.demographic);
  if (input.comparisonHackathonId)
    params.set("compareHackathon", input.comparisonHackathonId);
  else params.set("compareHackathon", "none");
  if (input.eventId) params.set("event", input.eventId);
  if (input.eventPurpose !== "all")
    params.set("eventPurpose", input.eventPurpose);
  input.eventTags.forEach((tag) => params.append("tag", tag));
  if (input.liveWindow !== "whole_hackathon")
    params.set("liveWindow", input.liveWindow);
  return params;
}
