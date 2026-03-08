import { describe, expect, it } from "vitest";

import { FORMS } from "@forge/consts";

describe("getDropdownOptionsFromConst", () => {
  it("should return LEVELS_OF_STUDY for 'LEVELS_OF_STUDY'", () => {
    const result = FORMS.getDropdownOptionsFromConst("LEVELS_OF_STUDY");
    expect(result).toEqual(FORMS.LEVELS_OF_STUDY);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return ALLERGIES for 'ALLERGIES'", () => {
    const result = FORMS.getDropdownOptionsFromConst("ALLERGIES");
    expect(result).toEqual(FORMS.ALLERGIES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return MAJORS for 'MAJORS'", () => {
    const result = FORMS.getDropdownOptionsFromConst("MAJORS");
    expect(result).toEqual(FORMS.MAJORS);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return GENDERS for 'GENDERS'", () => {
    const result = FORMS.getDropdownOptionsFromConst("GENDERS");
    expect(result).toEqual(FORMS.GENDERS);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return RACES_OR_ETHNICITIES for 'RACES_OR_ETHNICITIES'", () => {
    const result = FORMS.getDropdownOptionsFromConst("RACES_OR_ETHNICITIES");
    expect(result).toEqual(FORMS.RACES_OR_ETHNICITIES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return COUNTRIES for 'COUNTRIES'", () => {
    const result = FORMS.getDropdownOptionsFromConst("COUNTRIES");
    expect(result).toEqual(FORMS.COUNTRIES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return SCHOOLS for 'SCHOOLS'", () => {
    const result = FORMS.getDropdownOptionsFromConst("SCHOOLS");
    expect(result).toEqual(FORMS.SCHOOLS);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return COMPANIES for 'COMPANIES'", () => {
    const result = FORMS.getDropdownOptionsFromConst("COMPANIES");
    expect(result).toEqual(FORMS.COMPANIES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return SHIRT_SIZES for 'SHIRT_SIZES'", () => {
    const result = FORMS.getDropdownOptionsFromConst("SHIRT_SIZES");
    expect(result).toEqual(FORMS.SHIRT_SIZES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return EVENT_FEEDBACK_HEARD for 'EVENT_FEEDBACK_HEARD'", () => {
    const result = FORMS.getDropdownOptionsFromConst("EVENT_FEEDBACK_HEARD");
    expect(result).toEqual(FORMS.EVENT_FEEDBACK_HEARD);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return SHORT_LEVELS_OF_STUDY for 'SHORT_LEVELS_OF_STUDY'", () => {
    const result = FORMS.getDropdownOptionsFromConst("SHORT_LEVELS_OF_STUDY");
    expect(result).toEqual(FORMS.SHORT_LEVELS_OF_STUDY);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return SHORT_RACES_AND_ETHNICITIES for 'SHORT_RACES_AND_ETHNICITIES'", () => {
    const result = FORMS.getDropdownOptionsFromConst(
      "SHORT_RACES_AND_ETHNICITIES",
    );
    expect(result).toEqual(FORMS.SHORT_RACES_AND_ETHNICITIES);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return empty array for unknown constant name", () => {
    const result = FORMS.getDropdownOptionsFromConst("UNKNOWN_CONST");
    expect(result).toEqual([]);
  });

  it("should return empty array for empty string", () => {
    const result = FORMS.getDropdownOptionsFromConst("");
    expect(result).toEqual([]);
  });
});
