import { describe, expect, it } from "vitest";

import { JOB_BOARD } from "@forge/consts";

import {
  alertPreferenceCreateInputSchema,
  applicationSaveInputSchema,
  applicationUpdateInputSchema,
  companyTargetSchema,
  jobSearchInputSchema,
  locationTargetSchema,
  stageAllowsRound,
} from "../job-board";

const jobId = "00000000-0000-4000-8000-000000000001";

describe("job board constants", () => {
  it("defines every category in display order", () => {
    expect(Object.keys(JOB_BOARD.JOB_CATEGORY_DEFINITIONS).sort()).toEqual(
      [...JOB_BOARD.JOB_CATEGORIES].sort(),
    );
    expect(JOB_BOARD.JOB_CATEGORIES.at(-1)).toBe("other");
  });

  it("only allows rounds while interviewing", () => {
    expect(
      JOB_BOARD.APPLICATION_STAGES.filter((stage) => stageAllowsRound(stage)),
    ).toEqual(["interviewing"]);
  });
});

describe("job search input", () => {
  it("applies defaults to an empty URL", () => {
    expect(jobSearchInputSchema.parse({})).toEqual({
      includeInactive: false,
      limit: JOB_BOARD.JOB_SEARCH_DEFAULT_LIMIT,
      page: 1,
      remoteUs: false,
      sort: "newest",
    });
  });

  it("parses search param strings", () => {
    expect(
      jobSearchInputSchema.parse({
        category: "swe",
        includeInactive: "true",
        page: "3",
        postedWithin: "week",
        query: "  backend ",
        remoteUs: "false",
        state: "fl",
        track: "new_grad",
      }),
    ).toMatchObject({
      category: "swe",
      includeInactive: true,
      page: 3,
      postedWithin: "week",
      query: "backend",
      remoteUs: false,
      state: "FL",
      track: "new_grad",
    });
  });

  it("drops a blank query", () => {
    expect(jobSearchInputSchema.parse({ query: "   " }).query).toBeUndefined();
  });

  it.each([
    [{ track: "full_time" }],
    [{ limit: String(JOB_BOARD.JOB_SEARCH_MAX_LIMIT + 1) }],
    [{ state: "Florida" }],
    [{ company: "Google Inc." }],
    [{ unknown: "value" }],
  ])("rejects %o", (input) => {
    expect(jobSearchInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("alert targets", () => {
  it("accepts a searched company key or an Other name", () => {
    expect(
      companyTargetSchema.parse({ kind: "option", value: "google" }),
    ).toEqual({ kind: "option", value: "google" });
    expect(
      companyTargetSchema.parse({ kind: "other", text: "  Tiny Startup  " }),
    ).toEqual({ kind: "other", text: "Tiny Startup" });
  });

  it.each([
    [{ kind: "other", text: "   " }],
    [{ kind: "other", text: "!!!" }],
    [{ kind: "option", value: "Google" }],
    [{ kind: "other" }],
  ])("rejects company target %o", (input) => {
    expect(companyTargetSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a city, U.S. remote, or an Other location", () => {
    for (const input of [
      { kind: "option", value: "12-12875" },
      { kind: "remote_us" },
      { kind: "other", text: "Research Triangle" },
    ]) {
      expect(locationTargetSchema.safeParse(input).success).toBe(true);
    }
    expect(
      locationTargetSchema.safeParse({ kind: "option", value: "Orlando" })
        .success,
    ).toBe(false);
  });

  it("pairs each preference kind with its own target shape", () => {
    expect(
      alertPreferenceCreateInputSchema.safeParse({
        kind: "location",
        target: { kind: "remote_us" },
        track: "internship",
      }).success,
    ).toBe(true);
    expect(
      alertPreferenceCreateInputSchema.safeParse({
        kind: "company",
        target: { kind: "remote_us" },
        track: "internship",
      }).success,
    ).toBe(false);
  });
});

describe("application input", () => {
  it("defaults to a saved, community-visible application", () => {
    expect(applicationSaveInputSchema.parse({ jobId })).toEqual({
      jobId,
      privateNotes: null,
      round: null,
      stage: "saved",
      visibility: "community",
    });
  });

  it("accepts a round while interviewing", () => {
    expect(
      applicationSaveInputSchema.parse({
        jobId,
        round: 2,
        stage: "interviewing",
      }).round,
    ).toBe(2);
  });

  it("rejects a round outside interviewing", () => {
    const result = applicationSaveInputSchema.safeParse({
      jobId,
      round: 2,
      stage: "applied",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["round"]);
  });

  it("stores blank notes as null", () => {
    expect(
      applicationSaveInputSchema.parse({ jobId, privateNotes: "  " })
        .privateNotes,
    ).toBeNull();
  });

  it("rejects notes over the limit", () => {
    expect(
      applicationSaveInputSchema.safeParse({
        jobId,
        privateNotes: "x".repeat(JOB_BOARD.MAX_APPLICATION_NOTES_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("leaves round checks to the API when an update omits the stage", () => {
    expect(
      applicationUpdateInputSchema.safeParse({
        applicationId: jobId,
        round: 3,
      }).success,
    ).toBe(true);
    expect(
      applicationUpdateInputSchema.safeParse({
        applicationId: jobId,
        round: 3,
        stage: "offer",
      }).success,
    ).toBe(false);
  });
});
