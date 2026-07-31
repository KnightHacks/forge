import { describe, expect, it } from "vitest";

import {
  deriveHackathonRouteName,
  getHackathonDateWindowIssues,
  HACKATHON_SENDING_STATUSES,
  hackathonApplicationUrlSchema,
  hackathonClassColorSchema,
  hackathonClassDiscordRoleSchema,
} from "../hackathons";

/** A window every rule accepts, so each case below changes exactly one thing. */
function validWindow() {
  return {
    applicationDeadline: new Date("2026-09-01T00:00:00Z"),
    applicationOpen: new Date("2026-08-01T00:00:00Z"),
    confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
    endDate: new Date("2026-10-03T00:00:00Z"),
    startDate: new Date("2026-10-01T00:00:00Z"),
  };
}

describe("hackathon date window", () => {
  it("accepts an ordered window", () => {
    expect(getHackathonDateWindowIssues(validWindow())).toEqual([]);
  });

  // The four rules are deliberately asymmetric: two are strict and two permit
  // equal dates. That is invisible in review and is exactly what a later
  // "tidy these into consistency" change would silently break, so each
  // boundary is pinned rather than only the obvious violations.
  it("requires applications to open strictly before the deadline", () => {
    const sameInstant = validWindow();
    sameInstant.applicationOpen = sameInstant.applicationDeadline;

    expect(getHackathonDateWindowIssues(sameInstant)).toEqual([
      {
        message: "Application open must be before the application deadline.",
        path: ["applicationOpen"],
      },
    ]);
  });

  it("permits the confirmation deadline to equal the application deadline", () => {
    const sameInstant = validWindow();
    sameInstant.confirmationDeadline = sameInstant.applicationDeadline;

    expect(getHackathonDateWindowIssues(sameInstant)).toEqual([]);
  });

  it("permits the confirmation deadline to equal the start date", () => {
    const sameInstant = validWindow();
    sameInstant.confirmationDeadline = sameInstant.startDate;

    expect(getHackathonDateWindowIssues(sameInstant)).toEqual([]);
  });

  it("requires the start date strictly before the end date", () => {
    const sameInstant = validWindow();
    sameInstant.endDate = sameInstant.startDate;

    expect(getHackathonDateWindowIssues(sameInstant)).toEqual([
      {
        message: "Start date must be before the end date.",
        path: ["endDate"],
      },
    ]);
  });

  it("rejects a confirmation deadline before the application deadline", () => {
    const window = validWindow();
    window.confirmationDeadline = new Date("2026-08-20T00:00:00Z");

    expect(getHackathonDateWindowIssues(window)).toEqual([
      {
        message:
          "Confirmation deadline must be on or after the application deadline.",
        path: ["confirmationDeadline"],
      },
    ]);
  });

  it("reports invalid dates instead of comparing them", () => {
    const window = { ...validWindow(), startDate: new Date("not a date") };

    // Ordering rules are skipped entirely when a date is unparseable, so the
    // officer sees "invalid start date" rather than a confusing ordering
    // complaint derived from NaN comparisons.
    expect(getHackathonDateWindowIssues(window)).toEqual([
      { message: "Invalid start date.", path: ["startDate"] },
    ]);
  });
});

describe("hackathon sending statuses", () => {
  it("covers every application status except checked-in", () => {
    expect(HACKATHON_SENDING_STATUSES).toEqual([
      "withdrawn",
      "pending",
      "accepted",
      "waitlisted",
      "confirmed",
      "denied",
    ]);
    expect(HACKATHON_SENDING_STATUSES).not.toContain("checkedin");
  });
});

describe("derived route name", () => {
  // Officers no longer type this. It is derived only because the column is
  // NOT NULL UNIQUE and production Blade still routes on it.
  it.each([
    ["Knight Hacks X", "knight-hacks-x"],
    ["  BloomKnights  ", "bloomknights"],
    ["Knight Hacks: IX!", "knight-hacks-ix"],
    ["GemiKnights 2025", "gemiknights-2025"],
  ])("derives %s to %s", (displayName, expected) => {
    expect(deriveHackathonRouteName(displayName)).toBe(expected);
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(deriveHackathonRouteName("!!! Hacks !!!")).toBe("hacks");
  });

  it("yields an empty string when nothing survives, so the caller can fall back", () => {
    expect(deriveHackathonRouteName("!!!")).toBe("");
  });
});

describe("class discord role", () => {
  it("trims before matching, so a padded paste still works", () => {
    expect(
      hackathonClassDiscordRoleSchema.parse("  990000000000000201  "),
    ).toBe("990000000000000201");
  });

  it.each([
    ["<@&990000000000000201>", "a role mention"],
    ["9900000000000201", "sixteen digits"],
    ["9900000000000002011234", "twenty-two digits"],
  ])("rejects %s (%s)", (value) => {
    expect(hackathonClassDiscordRoleSchema.safeParse(value).success).toBe(
      false,
    );
  });
});

describe("class colour", () => {
  it("accepts six-digit hex in either case", () => {
    expect(hackathonClassColorSchema.parse("#4F46E5")).toBe("#4F46E5");
    expect(hackathonClassColorSchema.parse("#4f46e5")).toBe("#4f46e5");
  });

  it.each([
    ["#fff", "three-digit shorthand"],
    ["4F46E5", "no leading hash"],
    ["rebeccapurple", "a named colour"],
  ])("rejects %s (%s)", (value) => {
    expect(hackathonClassColorSchema.safeParse(value).success).toBe(false);
  });
});

describe("application link", () => {
  it("TC-012 normalises absent and blank values to null", () => {
    expect(hackathonApplicationUrlSchema.parse(undefined)).toBeNull();
    expect(hackathonApplicationUrlSchema.parse(null)).toBeNull();
    // The two the schema actually exists for: an officer clearing the field
    // sends "", and a stray space must not become "not a valid URL".
    expect(hackathonApplicationUrlSchema.parse("")).toBeNull();
    expect(hackathonApplicationUrlSchema.parse("   ")).toBeNull();
  });

  it("TC-012 caps the link length", () => {
    const tooLong = `https://example.test/${"a".repeat(2100)}`;
    expect(hackathonApplicationUrlSchema.safeParse(tooLong).success).toBe(
      false,
    );
  });

  it("keeps a full https link", () => {
    expect(
      hackathonApplicationUrlSchema.parse("https://bloomknights.org/apply"),
    ).toBe("https://bloomknights.org/apply");
  });

  it.each([
    ["bloomknights.org/apply", "no scheme"],
    // Zod's `.url()` accepts this; only the explicit scheme refine rejects it,
    // so this case is what keeps that refine from being deleted as redundant.
    ["javascript:alert(1)", "a non-http scheme"],
  ])("rejects %s (%s)", (value) => {
    expect(hackathonApplicationUrlSchema.safeParse(value).success).toBe(false);
  });

  // Schemes are case-insensitive per RFC 3986, and Word autocapitalization and
  // slide decks both produce this. A case-sensitive `startsWith` rejected it,
  // telling the officer an https link was not an https link.
  it.each([["HTTPS://bloomknights.org/apply"], ["Http://bloomknights.org"]])(
    "accepts %s regardless of scheme case",
    (value) => {
      expect(hackathonApplicationUrlSchema.safeParse(value).success).toBe(true);
    },
  );
});
