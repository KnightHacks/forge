import { describe, expect, it } from "vitest";

import { portalFormSchema } from "./portal-form-schema";
import {
  getSchoolChoiceSearchValue,
  isCustomSchoolValue,
  SCHOOL_CHOICES,
} from "./schools";

describe("KH IX school selection", () => {
  it("keeps manual entry visible for schools outside the catalog", () => {
    expect(isCustomSchoolValue("University of Central Florida")).toBe(false);
    expect(isCustomSchoolValue("North Lake Technical Academy")).toBe(true);
    expect(isCustomSchoolValue("  ")).toBe(false);
  });

  it("puts the manual-entry action before catalog results", () => {
    expect(SCHOOL_CHOICES[0]).toMatchObject({
      kind: "custom",
      label: "Other school — enter manually",
    });
    expect(
      getSchoolChoiceSearchValue(
        SCHOOL_CHOICES[0]!,
        "School that is not listed",
      ),
    ).toContain("School that is not listed");
  });

  it("submits a custom school through the SDK-derived KH IX form schema", () => {
    expect(
      portalFormSchema.shape.school.parse("North Lake Technical Academy"),
    ).toBe("North Lake Technical Academy");
  });
});
