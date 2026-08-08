import type { z } from "zod";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  companyAdminUpdateSchema,
  companyCreateInputSchema,
  employmentHistorySchema,
  employmentInputSchema,
  guildLocationInputSchema,
  normalizeCompanyName,
  normalizeEmploymentMonth,
  usCityKeySchema,
} from "../career";

const currentEmployment = {
  cityKey: "12-12875",
  companyId: "00000000-0000-4000-8000-000000000001",
  endMonth: null,
  experienceType: "full_time",
  guildVisible: true,
  startMonth: "2025-06",
  state: "current",
  title: "Software Engineer",
} as const;

describe("career validation", () => {
  it("keeps employment month inputs typed as strings", () => {
    expectTypeOf<
      z.input<typeof employmentInputSchema>["startMonth"]
    >().toEqualTypeOf<string | null | undefined>();
  });

  it.each([
    ["2026-05", "2026-05"],
    ["05/2026", "2026-05"],
    ["5-2026", "2026-05"],
    ["May 2026", "2026-05"],
    ["Aug. 2026", "2026-08"],
    ["september 2026", "2026-09"],
  ])("normalizes employment month %s", (input, expected) => {
    expect(normalizeEmploymentMonth(input)).toBe(expected);
  });

  it("accepts human-readable employment months and emits canonical values", () => {
    expect(
      employmentInputSchema.parse({
        ...currentEmployment,
        endMonth: "August 2026",
        startMonth: "05/2026",
        state: "past",
      }),
    ).toMatchObject({
      endMonth: "2026-08",
      startMonth: "2026-05",
    });
  });

  it("TC-003 normalizes insignificant company punctuation and whitespace", () => {
    expect(normalizeCompanyName("  Advanced Micro-Devices, Inc. ")).toBe(
      "advanced micro devices inc",
    );
    expect(normalizeCompanyName("AMD")).toBe("amd");
  });

  it("TC-004 accepts a bounded pending-company proposal", () => {
    expect(
      companyCreateInputSchema.parse({
        displayName: "  Knight Hacks Labs  ",
      }),
    ).toEqual({ displayName: "Knight Hacks Labs" });
  });

  it("TC-NEG-002 rejects obvious disallowed company names", () => {
    expect(
      companyCreateInputSchema.safeParse({
        displayName: "fuck sponsors llc",
      }).success,
    ).toBe(false);
  });

  it("validates and canonicalizes officer-managed company metadata", () => {
    expect(
      companyAdminUpdateSchema.parse({
        aliases: [
          " Advanced Micro Devices ",
          "advanced micro devices",
          "AMD, Inc.",
        ],
        displayName: "AMD",
        domain: "HTTPS://AMD.COM/careers",
        legalName: "Advanced Micro Devices, Inc.",
      }),
    ).toEqual({
      aliases: ["Advanced Micro Devices", "AMD, Inc."],
      displayName: "AMD",
      domain: "amd.com",
      legalName: "Advanced Micro Devices, Inc.",
    });
  });

  it("TC-001 accepts current and former employment history", () => {
    expect(
      employmentHistorySchema.parse([
        currentEmployment,
        {
          ...currentEmployment,
          companyId: "00000000-0000-4000-8000-000000000002",
          endMonth: "2024-08",
          experienceType: "internship",
          startMonth: "2024-05",
          state: "past",
          title: "Software Engineering Intern",
        },
      ]),
    ).toHaveLength(2);
    expect(employmentHistorySchema.parse([])).toEqual([]);
  });

  it("accepts a new company proposal inline with employment", () => {
    expect(
      employmentInputSchema.parse({
        ...currentEmployment,
        companyId: undefined,
        proposedCompanyName: "Knight Hacks Labs",
      }),
    ).toMatchObject({
      companyId: null,
      proposedCompanyName: "Knight Hacks Labs",
    });
  });

  it("requires exactly one existing company or new-company proposal", () => {
    expect(
      employmentInputSchema.safeParse({
        ...currentEmployment,
        companyId: undefined,
      }).success,
    ).toBe(false);
    expect(
      employmentInputSchema.safeParse({
        ...currentEmployment,
        proposedCompanyName: "Knight Hacks Labs",
      }).success,
    ).toBe(false);
  });

  it("TC-NEG-001 rejects an end month on current employment", () => {
    const result = employmentInputSchema.safeParse({
      ...currentEmployment,
      endMonth: "2026-01",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["endMonth"]);
    }
  });

  it("TC-NEG-001 rejects past employment ending before it starts", () => {
    const result = employmentInputSchema.safeParse({
      ...currentEmployment,
      endMonth: "2024-12",
      startMonth: "2025-01",
      state: "past",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["endMonth"]);
    }
  });

  it("does not allow members to author unconfirmed employment", () => {
    expect(
      employmentInputSchema.safeParse({
        ...currentEmployment,
        state: "unknown",
      }).success,
    ).toBe(false);
  });

  it("caps a complete history at fifty entries", () => {
    expect(
      employmentHistorySchema.safeParse(
        Array.from({ length: 51 }, (_, index) => ({
          ...currentEmployment,
          companyId: `00000000-0000-4000-8000-${String(index).padStart(
            12,
            "0",
          )}`,
        })),
      ).success,
    ).toBe(false);
  });

  it("TC-013 validates Census place keys and current-location visibility", () => {
    expect(usCityKeySchema.parse("12-12875")).toBe("12-12875");
    expect(usCityKeySchema.safeParse("Orlando, FL").success).toBe(false);
    expect(
      guildLocationInputSchema.parse({
        currentCityKey: "12-12875",
        guildLocationVisible: false,
      }),
    ).toEqual({
      currentCityKey: "12-12875",
      guildLocationVisible: false,
    });
  });
});
