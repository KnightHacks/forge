import { describe, expect, it } from "vitest";

import { memberSettingsFields } from "@forge/validators";

import {
  memberSettingsFieldsBySection,
  memberSettingsSectionOrder,
} from "~/app/_components/member/member-settings-sections";

describe("memberSettingsSectionOrder", () => {
  it("renders personal details first and the public Guild profile last", () => {
    expect(memberSettingsSectionOrder).toEqual([
      "Personal",
      "Academics",
      "Guild",
    ]);
  });
});

describe("memberSettingsFieldsBySection", () => {
  it("returns one group per section, in render order", () => {
    expect(
      memberSettingsFieldsBySection().map((group) => group.section),
    ).toEqual(memberSettingsSectionOrder);
  });

  it("renders every settings field exactly once", () => {
    const grouped = memberSettingsFieldsBySection().flatMap(
      (group) => group.fields,
    );

    expect(grouped.map((field) => field.name).sort()).toEqual(
      memberSettingsFields.map((field) => field.name).sort(),
    );
  });

  it("puts each field only in its own section", () => {
    for (const group of memberSettingsFieldsBySection()) {
      expect(
        group.fields.every((field) => field.section === group.section),
      ).toBe(true);
    }
  });

  it("gives every section at least one field, so no card renders empty", () => {
    for (const group of memberSettingsFieldsBySection()) {
      expect(group.fields.length).toBeGreaterThan(0);
    }
  });

  it("excludes the signup-only upload fields the settings form handles itself", () => {
    const names = memberSettingsFieldsBySection().flatMap((group) =>
      group.fields.map((field) => field.name),
    );

    expect(names).not.toContain("profilePictureUrl");
    expect(names).not.toContain("resumeUrl");
    expect(names).not.toContain("codeOfConductAccepted");
  });
});
