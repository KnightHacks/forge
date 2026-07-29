import { describe, expect, it } from "vitest";

import {
  formatRespondentAudience,
  formatResponseMode,
  formatSectionName,
  formBuilderShareHref,
  localDateTime,
  toSlug,
} from "~/app/_components/admin/forms/form-builder-formatting";

describe("toSlug", () => {
  it("lowercases and joins words with single dashes", () => {
    expect(toSlug("Workshop Interest Form")).toBe("workshop-interest-form");
  });

  it("folds accents instead of dropping the letters", () => {
    expect(toSlug("Café Résumé Night")).toBe("cafe-resume-night");
  });

  it("collapses runs of punctuation and trims the edges", () => {
    expect(toSlug("  --Hack/Night!!   2026 -- ")).toBe("hack-night-2026");
  });

  it("returns an empty slug when nothing survives", () => {
    expect(toSlug("🙂🙂")).toBe("");
    expect(toSlug("")).toBe("");
  });

  it("truncates to the 80 characters the slug column accepts", () => {
    const slug = toSlug("a".repeat(200));

    expect(slug).toHaveLength(80);
  });
});

describe("localDateTime", () => {
  it("renders the viewer's own wall clock for the instant", () => {
    const value = "2026-08-01T04:00:00.000Z";
    const local = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    const expected = [
      local.getFullYear(),
      "-",
      pad(local.getMonth() + 1),
      "-",
      pad(local.getDate()),
      "T",
      pad(local.getHours()),
      ":",
      pad(local.getMinutes()),
    ].join("");

    expect(localDateTime(value)).toBe(expected);
  });

  it("gives a datetime-local input an empty value when there is no date", () => {
    expect(localDateTime(null)).toBe("");
    expect(localDateTime("")).toBe("");
  });
});

describe("formBuilderShareHref", () => {
  it("keeps the rest of the query string when opening", () => {
    expect(formBuilderShareHref("/admin/forms/id", "view=details", true)).toBe(
      "/admin/forms/id?view=details&dialog=share",
    );
  });

  it("drops the question mark when closing leaves nothing behind", () => {
    expect(formBuilderShareHref("/admin/forms/id", "dialog=share", false)).toBe(
      "/admin/forms/id",
    );
    expect(formBuilderShareHref("/admin/forms/id", "", false)).toBe(
      "/admin/forms/id",
    );
  });

  it("opening an already-open dialog does not stack the parameter", () => {
    expect(formBuilderShareHref("/admin/forms/id", "dialog=share", true)).toBe(
      "/admin/forms/id?dialog=share",
    );
  });
});

describe("form configuration summary labels", () => {
  const sections = [
    { id: "section-1", name: "Outreach" },
    { id: "section-2", name: "Operations" },
  ];

  it("names the selected section", () => {
    expect(formatSectionName(sections, "section-2")).toBe("Operations");
  });

  it("falls back when the section is unset or not visible here", () => {
    expect(formatSectionName(sections, "")).toBe("No section");
    expect(formatSectionName(sections, "section-9")).toBe("No section");
    expect(formatSectionName([], "section-1")).toBe("No section");
  });

  it("spells out each response mode", () => {
    expect(formatResponseMode("single_locked")).toBe("One locked response");
    expect(formatResponseMode("single_editable")).toBe("One editable response");
    expect(formatResponseMode("multiple_locked")).toBe(
      "Multiple locked responses",
    );
  });

  it("reads no selected roles as everyone, not nobody", () => {
    expect(formatRespondentAudience([])).toBe("All eligible members");
    expect(formatRespondentAudience(["role-1"])).toBe("1 respondent roles");
    expect(formatRespondentAudience(["role-1", "role-2"])).toBe(
      "2 respondent roles",
    );
  });
});
