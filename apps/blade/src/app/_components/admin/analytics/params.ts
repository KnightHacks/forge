import type { AnalyticsReportInput } from "@forge/validators";
import { analyticsReportInputSchema } from "@forge/validators";

export type AnalyticsSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function date(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function period(params: AnalyticsSearchParams): AnalyticsReportInput["period"] {
  const selection = first(params.period);
  if (selection === "semester") return { kind: "current_semester" };
  if (selection === "all-time") return { kind: "all_time" };
  if (selection?.startsWith("ay:")) {
    const startYear = Number(selection.slice(3));
    if (Number.isInteger(startYear))
      return { kind: "academic_year", startYear };
  }
  if (selection === "custom") {
    const from = date(first(params.from));
    const to = date(first(params.to));
    if (from && to) return { from, kind: "custom", to };
  }
  return { kind: "current_academic_year" };
}

export function parseAnalyticsSearchParams(params: AnalyticsSearchParams) {
  const parsed = analyticsReportInputSchema.safeParse({
    comparison: first(params.comparison),
    demographic: first(params.demographic),
    eventId: first(params.event) ?? null,
    eventTags: list(params.tag),
    period: period(params),
    section: first(params.section),
  });
  return parsed.success ? parsed.data : analyticsReportInputSchema.parse({});
}

function dateParam(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildAnalyticsSearchParams(input: AnalyticsReportInput) {
  const params = new URLSearchParams();
  if (input.section !== "overview") params.set("section", input.section);
  if (input.demographic !== "level_of_study") {
    params.set("demographic", input.demographic);
  }
  if (input.comparison !== "previous_academic_year") {
    params.set("comparison", input.comparison);
  }
  input.eventTags.forEach((tag) => params.append("tag", tag));
  if (input.eventId) params.set("event", input.eventId);
  switch (input.period.kind) {
    case "current_semester":
      params.set("period", "semester");
      break;
    case "academic_year":
      params.set("period", `ay:${input.period.startYear}`);
      break;
    case "all_time":
      params.set("period", "all-time");
      break;
    case "custom":
      params.set("period", "custom");
      params.set("from", dateParam(input.period.from));
      params.set("to", dateParam(input.period.to));
      break;
    case "current_academic_year":
      break;
  }
  return params;
}
