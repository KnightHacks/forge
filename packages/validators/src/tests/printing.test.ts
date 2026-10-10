import { describe, expect, it } from "vitest";

import {
  hackerSubmitPrintJobSchema,
  printingSetEstimatedReadyAtInputSchema,
  printingSetEstimateSettingsInputSchema,
  printingUpdateStatusInputSchema,
} from "../index";

const JOB_ID = "00000000-0000-4000-8000-000000000001";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000002";
const fileId = (index: number) =>
  `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;

describe("printing inputs", () => {
  it("[TC-NEG-014] requires a note only for needs_clarification", () => {
    for (const note of [undefined, null, "", "   "]) {
      expect(
        printingUpdateStatusInputSchema.safeParse({
          jobId: JOB_ID,
          note,
          status: "needs_clarification",
        }).success,
      ).toBe(false);
    }
    expect(
      printingUpdateStatusInputSchema.parse({
        jobId: JOB_ID,
        note: "  Which color?  ",
        status: "needs_clarification",
      }).note,
    ).toBe("Which color?");
    expect(
      printingUpdateStatusInputSchema.parse({
        jobId: JOB_ID,
        note: "   ",
        status: "printing",
      }).note,
    ).toBeNull();
  });

  it("[TC-NEG-005] accepts 1 to 5 distinct files and a real description", () => {
    const submit = (fileIds: string[], description = "Bracket") =>
      hackerSubmitPrintJobSchema.safeParse({
        category: "project",
        description,
        fileIds,
        idempotencyKey: "key",
      }).success;

    expect(submit([fileId(1)])).toBe(true);
    expect(submit([1, 2, 3, 4, 5].map(fileId))).toBe(true);
    expect(submit([])).toBe(false);
    expect(submit([1, 2, 3, 4, 5, 6].map(fileId))).toBe(false);
    expect(submit([fileId(1), fileId(1)])).toBe(false);
    expect(submit([fileId(1)], "   ")).toBe(false);
  });

  it("[TC-NEG-015] bounds estimate settings and ready-time overrides", () => {
    const settings = (printMinutes: number, printerCount: number) =>
      printingSetEstimateSettingsInputSchema.safeParse({
        hackathonId: HACKATHON_ID,
        printMinutes,
        printerCount,
      }).success;
    expect(settings(5, 1)).toBe(true);
    expect(settings(600, 20)).toBe(true);
    expect(settings(4, 1)).toBe(false);
    expect(settings(601, 1)).toBe(false);
    expect(settings(60, 0)).toBe(false);
    expect(settings(60, 21)).toBe(false);

    const override = (estimatedReadyAt: Date | null) =>
      printingSetEstimatedReadyAtInputSchema.safeParse({
        estimatedReadyAt,
        jobId: JOB_ID,
      }).success;
    const hours = (count: number) => new Date(Date.now() + count * 3_600_000);
    expect(override(null)).toBe(true);
    expect(override(hours(1))).toBe(true);
    expect(override(hours(-1))).toBe(false);
    expect(override(hours(24 * 8))).toBe(false);
  });
});

it("requires a category on all new requests", () => {
  const input = {
    description: "Bracket",
    fileIds: [fileId(1)],
    idempotencyKey: "key",
  };
  expect(hackerSubmitPrintJobSchema.safeParse(input).success).toBe(false);
  expect(
    hackerSubmitPrintJobSchema.safeParse({ ...input, category: "other" })
      .success,
  ).toBe(false);
  expect(
    hackerSubmitPrintJobSchema.safeParse({ ...input, category: "personal" })
      .success,
  ).toBe(true);
});
