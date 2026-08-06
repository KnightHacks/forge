import { describe, expect, it } from "vitest";

import * as validators from "../index";

const HACKATHON_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

function schema(name: string) {
  const candidate = (validators as Record<string, unknown>)[name];
  expect(candidate, `${name} must be exported`).toBeDefined();
  return candidate as {
    parse: (value: unknown) => Record<string, unknown>;
    safeParse: (value: unknown) => { success: boolean };
  };
}

describe("Hackathon Analytics validators", () => {
  it("publishes the complete six-section, demographic, and local-view defaults", () => {
    const parsed = schema("hackathonAnalyticsReportInputSchema").parse({
      hackathonId: HACKATHON_ID,
    });

    expect(parsed).toMatchObject({
      audienceView: "composition",
      compositionCohort: "applicants",
      demographic: "level_of_study",
      eventPurpose: "all",
      liveWindow: "whole_hackathon",
      section: "overview",
    });

    const sections = [
      "overview",
      "applications",
      "events",
      "live_operations",
      "audience",
      "reports",
    ];
    for (const section of sections) {
      expect(
        schema("hackathonAnalyticsReportInputSchema").safeParse({
          hackathonId: HACKATHON_ID,
          section,
        }).success,
      ).toBe(true);
    }
  });

  it("keeps Club and Hack composition cohorts scope-specific", () => {
    expect(schema("clubAudienceCohortSchema").parse(undefined)).toBe(
      "all_profiles",
    );
    expect(
      schema("clubAudienceCohortSchema").safeParse("reached").success,
    ).toBe(true);
    expect(
      schema("clubAudienceCohortSchema").safeParse("on_site").success,
    ).toBe(false);

    expect(
      schema("hackathonAnalyticsReportInputSchema").safeParse({
        compositionCohort: "reached",
        hackathonId: HACKATHON_ID,
      }).success,
    ).toBe(false);
    for (const compositionCohort of [
      "applicants",
      "pending",
      "accepted",
      "confirmed",
      "on_site",
      "event_engaged",
    ]) {
      expect(
        schema("hackathonAnalyticsReportInputSchema").safeParse({
          compositionCohort,
          hackathonId: HACKATHON_ID,
        }).success,
      ).toBe(true);
    }

    const club = schema("analyticsReportInputSchema");
    expect(club.parse({})).toMatchObject({
      clubAudienceCohort: "all_profiles",
    });
    expect(club.safeParse({ clubAudienceCohort: "reached" }).success).toBe(
      true,
    );
    expect(club.safeParse({ clubAudienceCohort: "on_site" }).success).toBe(
      false,
    );
    expect(
      club.safeParse({ demographic: "inferred_year_of_study" }).success,
    ).toBe(true);
  });

  it("accepts inferred-year and Hack-only dimensions without merging study levels", () => {
    for (const demographic of [
      "age",
      "school",
      "major",
      "level_of_study",
      "inferred_year_of_study",
      "graduation",
      "gender",
      "race_or_ethnicity",
      "shirt_size",
      "country",
      "first_time_status",
    ]) {
      expect(
        schema("hackathonAnalyticsReportInputSchema").safeParse({
          demographic,
          hackathonId: HACKATHON_ID,
        }).success,
      ).toBe(true);
    }
  });

  it("requires scoped event state for since-event-start and distinct comparisons", () => {
    const report = schema("hackathonAnalyticsReportInputSchema");
    expect(
      report.safeParse({
        hackathonId: HACKATHON_ID,
        liveWindow: "since_event_start",
      }).success,
    ).toBe(false);
    expect(
      report.safeParse({
        eventId: EVENT_ID,
        hackathonId: HACKATHON_ID,
        liveWindow: "since_event_start",
      }).success,
    ).toBe(true);
    expect(
      report.safeParse({
        comparisonHackathonId: HACKATHON_ID,
        hackathonId: HACKATHON_ID,
      }).success,
    ).toBe(false);
  });

  it("validates event purpose, policy acknowledgement, and bounded resume parts", () => {
    const report = schema("hackathonAnalyticsReportInputSchema");
    for (const eventPurpose of [
      "program",
      "primary_check_in",
      "legacy_unknown",
      "all",
    ]) {
      expect(
        report.safeParse({ eventPurpose, hackathonId: HACKATHON_ID }).success,
      ).toBe(true);
    }

    const resume = schema("resumeBundlePartInputSchema");
    expect(
      resume.safeParse({
        hackathonId: HACKATHON_ID,
        partNumber: 1,
        planFingerprint: "plan_abc123",
        policyAcknowledged: true,
        policyVersion: "resume-sensitive-index-v1",
        pool: "current_confirmed",
        scope: "hackathon",
      }).success,
    ).toBe(true);
    expect(
      resume.safeParse({
        hackathonId: HACKATHON_ID,
        partNumber: 0,
        planFingerprint: "plan_abc123",
        policyAcknowledged: false,
        policyVersion: "wrong",
        pool: "current_confirmed",
        scope: "hackathon",
      }).success,
    ).toBe(false);
    expect(
      resume.safeParse({
        eventId: EVENT_ID,
        hackathonId: HACKATHON_ID,
        partNumber: 1,
        planFingerprint: "plan_abc123",
        policyAcknowledged: true,
        policyVersion: "resume-sensitive-index-v1",
        pool: "current_confirmed",
        scope: "hackathon",
      }).success,
    ).toBe(false);
    expect(
      resume.safeParse({
        currentStatuses: [],
        hackathonId: HACKATHON_ID,
        partNumber: 1,
        planFingerprint: "plan_abc123",
        policyAcknowledged: true,
        policyVersion: "resume-sensitive-index-v1",
        pool: "custom_current_statuses",
        scope: "hackathon",
      }).success,
    ).toBe(false);
    expect(
      resume.parse({
        currentStatuses: ["confirmed", "confirmed", "checkedin"],
        hackathonId: HACKATHON_ID,
        partNumber: 1,
        planFingerprint: "plan_abc123",
        policyAcknowledged: true,
        policyVersion: "resume-sensitive-index-v1",
        pool: "custom_current_statuses",
        scope: "hackathon",
      }),
    ).toMatchObject({ currentStatuses: ["confirmed", "checkedin"] });
  });

  it("keeps section, external, and identified exports as explicit kinds", () => {
    const analyticsExport = schema("hackathonAnalyticsExportInputSchema");
    for (const kind of [
      "overview",
      "applications",
      "events",
      "live_operations",
      "audience",
      "points_leaderboard",
      "institutional_summary",
      "sponsor",
    ]) {
      expect(
        analyticsExport.safeParse({
          kind,
          report: { hackathonId: HACKATHON_ID },
        }).success,
      ).toBe(true);
    }
    expect(
      analyticsExport.safeParse({
        kind: "internal",
        report: { hackathonId: HACKATHON_ID },
      }).success,
    ).toBe(false);
  });
});
