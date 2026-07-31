/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it } from "vitest";

import { personalizationFieldsForDomain } from "@forge/email/fields";

import {
  applyManualRecipientExclusions,
  buildEmailAudienceSnapshot,
  isDevelopmentReviewAudienceDefinition,
  normalizeRecipientEmail,
} from "../../utils/email/audience";

const HACKATHON_ID = "00000000-0000-4000-8000-000000000012";

describe("Email Portal audience resolution", () => {
  it("recognizes only team and role audiences for development delivery", () => {
    expect(
      isDevelopmentReviewAudienceDefinition([{ kind: "team_members" }]),
    ).toBe(true);
    expect(
      isDevelopmentReviewAudienceDefinition([
        { kind: "team_members" },
        {
          kind: "role",
          roleId: "00000000-0000-4000-8000-000000000013",
        },
      ]),
    ).toBe(true);
    expect(
      isDevelopmentReviewAudienceDefinition([{ kind: "current_members" }]),
    ).toBe(false);
    expect(
      isDevelopmentReviewAudienceDefinition([
        { kind: "team_members", status: "confirmed" },
      ]),
    ).toBe(false);
  });

  it("resolves a role through Member email with auth email as no-profile fallback", () => {
    const roleId = "00000000-0000-4000-8000-000000000013";
    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-25",
      definitions: [{ kind: "role", roleId }],
      hackers: [],
      members: [
        {
          email: "member-preferred@example.test",
          graduationDate: "2027-05-01",
          id: "member-role",
          name: "Member Preferred",
          roleIds: [roleId],
          roleNames: ["Design"],
        },
      ],
      providerStates: [],
      usersWithoutMember: [
        {
          email: "auth-fallback@example.test",
          name: "Auth Fallback",
          roleIds: [roleId],
          roleNames: ["Design"],
          userId: "user-without-member",
        },
      ],
    });

    expect(snapshot.recipients.map(({ email }) => email).sort()).toEqual([
      "auth-fallback@example.test",
      "member-preferred@example.test",
    ]);
    expect(snapshot.recipients).toContainEqual(
      expect.objectContaining({
        email: "member-preferred@example.test",
        matchReasons: [`role:${roleId}`],
      }),
    );
  });

  it("TC-017 removes only selected emails from the resolved recipient pool", () => {
    const result = applyManualRecipientExclusions(
      [
        { email: "ada@example.test", name: "Ada" },
        { email: "grace@example.test", name: "Grace" },
      ],
      [" ADA@EXAMPLE.TEST ", "outside@example.test"],
    );

    expect(result.included).toEqual([
      { email: "grace@example.test", name: "Grace" },
    ]);
    expect([...result.excludedEmails]).toEqual(["ada@example.test"]);
  });

  it("TC-010 partitions current members and alumni at the date boundary", () => {
    const input = {
      currentDate: "2026-07-25",
      hackers: [],
      members: [
        {
          email: "past@example.test",
          graduationDate: "2026-07-24",
          id: "past",
          name: "Past",
          roleNames: [],
        },
        {
          email: "equal@example.test",
          graduationDate: "2026-07-25",
          id: "equal",
          name: "Equal",
          roleNames: [],
        },
        {
          email: "future@example.test",
          graduationDate: "2027-05-01",
          id: "future",
          name: "Future",
          roleNames: [],
        },
      ],
      providerStates: [],
    };

    const current = buildEmailAudienceSnapshot({
      ...input,
      definitions: [{ kind: "current_members" }],
    });
    const alumni = buildEmailAudienceSnapshot({
      ...input,
      definitions: [{ kind: "alumni" }],
    });

    expect(current.recipients.map(({ email }) => email).sort()).toEqual([
      "equal@example.test",
      "future@example.test",
    ]);
    expect(alumni.recipients.map(({ email }) => email)).toEqual([
      "past@example.test",
    ]);
  });

  it("TC-011 uses enabled linked roles and excludes users without Member profiles", () => {
    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-25",
      definitions: [{ kind: "team_members" }],
      hackers: [],
      members: [
        {
          email: "designer@example.test",
          graduationDate: "2027-05-01",
          id: "member-1",
          name: "Designer",
          roleIds: ["role-design"],
          roleNames: ["Design"],
        },
        {
          email: "social@example.test",
          graduationDate: "2027-05-01",
          id: "member-2",
          name: "Social",
          roleIds: ["role-social"],
          roleNames: ["Social"],
        },
      ],
      providerStates: [],
      teamRoleIds: ["role-design"],
      usersWithoutMember: [
        {
          email: "oauth-real-address@example.com",
          roleIds: ["role-design"],
          roleNames: ["Design"],
          userId: "user-without-member",
        },
      ],
    });

    expect(snapshot.recipients.map(({ email }) => email)).toEqual([
      "designer@example.test",
    ]);
    expect(snapshot.warnings).toContainEqual(
      expect.objectContaining({
        code: "TEAM_USER_WITHOUT_MEMBER",
        count: 1,
      }),
    );
    expect(JSON.stringify(snapshot)).not.toContain(
      "oauth-real-address@example.com",
    );
  });

  it("TC-012 scopes hackers by stable hackathon ID and status", () => {
    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-25",
      definitions: [
        {
          hackathonId: HACKATHON_ID,
          kind: "hackathon",
          statuses: ["confirmed", "withdrawn"],
        },
      ],
      hackers: [
        {
          email: "confirmed@example.test",
          hackathonId: HACKATHON_ID,
          id: "h1",
          name: "Confirmed",
          status: "confirmed",
        },
        {
          email: "pending@example.test",
          hackathonId: HACKATHON_ID,
          id: "h2",
          name: "Pending",
          status: "pending",
        },
        {
          email: "other@example.test",
          hackathonId: "00000000-0000-4000-8000-000000000099",
          id: "h3",
          name: "Other",
          status: "confirmed",
        },
        {
          email: "withdrawn@example.test",
          hackathonId: HACKATHON_ID,
          id: "h4",
          name: "Withdrawn",
          status: "withdrawn",
        },
      ],
      members: [],
      providerStates: [],
    });

    expect(snapshot.recipients.map(({ email }) => email).sort()).toEqual([
      "confirmed@example.test",
      "withdrawn@example.test",
    ]);
  });

  it("TC-013 normalizes only surrounding whitespace and case", () => {
    expect(normalizeRecipientEmail(" Ada@Example.Test ")).toBe(
      "ada@example.test",
    );
    expect(normalizeRecipientEmail("ada+portal@example.test")).toBe(
      "ada+portal@example.test",
    );
    expect(normalizeRecipientEmail("a.da@example.test")).toBe(
      "a.da@example.test",
    );

    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-25",
      definitions: [
        { kind: "current_members" },
        { hackathonId: HACKATHON_ID, kind: "hackathon" },
      ],
      hackers: [
        {
          email: " ADA@example.test ",
          hackathonId: HACKATHON_ID,
          id: "h1",
          name: "Hacker Ada",
          status: "confirmed",
        },
        {
          email: "ada+portal@example.test",
          hackathonId: HACKATHON_ID,
          id: "h2",
          name: "Plus Ada",
          status: "confirmed",
        },
      ],
      members: [
        {
          email: "Ada@Example.Test",
          graduationDate: "2027-05-01",
          id: "m1",
          name: "Member Ada",
          roleNames: [],
        },
      ],
      providerStates: [],
    });

    expect(snapshot.counts).toMatchObject({
      duplicatesCollapsed: 1,
      finalUnique: 2,
      rawMatches: 3,
    });
    expect(snapshot.recipients[0]).toEqual(
      expect.objectContaining({
        email: "ada@example.test",
        matchReasons: expect.arrayContaining([
          "current_members",
          `hackathon:${HACKATHON_ID}:confirmed`,
        ]),
      }),
    );
  });

  it("TC-014 gives Member attributes deterministic precedence", () => {
    const input = {
      currentDate: "2026-07-25",
      definitions: [
        { kind: "current_members" as const },
        { hackathonId: HACKATHON_ID, kind: "hackathon" as const },
      ],
      hackers: [
        {
          email: "same@example.test",
          hackathonId: HACKATHON_ID,
          id: "h2",
          name: "Zed Hacker",
          status: "pending" as const,
        },
        {
          email: "SAME@example.test",
          hackathonId: HACKATHON_ID,
          id: "h1",
          name: "Amy Hacker",
          status: "confirmed" as const,
        },
      ],
      members: [
        {
          email: "same@example.test",
          graduationDate: "2027-05-01",
          id: "m1",
          name: "Morgan Member",
          roleNames: [],
        },
      ],
      providerStates: [],
    };

    const first = buildEmailAudienceSnapshot(input);
    const second = buildEmailAudienceSnapshot(input);
    expect(first.recipients[0]?.attributes.recipient.name).toBe(
      "Morgan Member",
    );
    expect(first.conflicts).toHaveLength(1);
    expect(second.checksum).toBe(first.checksum);
  });

  it("TC-015 excludes invalid, blocklisted, and unsubscribed candidates", () => {
    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-25",
      definitions: [{ kind: "current_members" }],
      hackers: [],
      members: [
        {
          email: "valid@example.test",
          graduationDate: "2027-05-01",
          id: "m1",
          mlhConsent: false,
          name: "Valid",
          roleNames: [],
        },
        {
          email: "not-an-email",
          graduationDate: "2027-05-01",
          id: "m2",
          mlhConsent: true,
          name: "Invalid",
          roleNames: [],
        },
        {
          email: "blocked@example.test",
          graduationDate: "2027-05-01",
          id: "m3",
          name: "Blocked",
          roleNames: [],
        },
        {
          email: "unsub@example.test",
          graduationDate: "2027-05-01",
          id: "m4",
          name: "Unsub",
          roleNames: [],
        },
      ],
      providerStates: [
        { email: "blocked@example.test", status: "blocklisted" },
        { email: "unsub@example.test", status: "unsubscribed" },
      ],
    });

    expect(snapshot.recipients.map(({ email }) => email)).toEqual([
      "valid@example.test",
    ]);
    expect(snapshot.counts).toMatchObject({
      excludedBlocklisted: 1,
      excludedInvalid: 1,
      excludedUnsubscribed: 1,
      finalUnique: 1,
    });
  });
});

describe("hackathon personalization reaches the send path", () => {
  /**
   * The catalog, the preview sample, and the delivered attributes have to name
   * the same `hackathon.*` fields.
   *
   * A field present in the first two but missing from the third renders in the
   * preview an officer approves and blank in the mail an applicant receives —
   * silently, because nothing compares them. Four fields were added to the
   * catalog and the sample without being added here, which is what this pins.
   */
  it("fills every hackathon.* field the catalog offers", () => {
    const snapshot = buildEmailAudienceSnapshot({
      currentDate: "2026-07-31",
      definitions: [
        {
          hackathonId: HACKATHON_ID,
          kind: "hackathon",
          statuses: ["accepted"],
        },
      ],
      hackers: [
        {
          email: "hacker@example.test",
          firstName: "Dylan",
          hackathonApplicationUrl: "https://bloomknights.org/apply",
          hackathonConfirmationDeadline: "Oct 3, 2026",
          hackathonDisplayName: "BloomKnights",
          hackathonEndDate: "Oct 11, 2026",
          hackathonId: HACKATHON_ID,
          hackathonName: "bloomknights",
          hackathonStartDate: "Oct 9, 2026",
          id: "00000000-0000-4000-8000-0000000000a1",
          name: "Dylan Vidal",
          status: "accepted",
        },
      ],
      members: [],
      providerStates: [],
    });

    const [recipient] = snapshot.recipients;
    const hackathon = recipient?.attributes.hackathon ?? {};

    // Derived from the catalog, not written out. A hand-written `toEqual` would
    // still pass after someone adds `hackathon.venue` to `PERSONALIZATION_FIELDS`
    // and to the preview sample without populating it here — which is exactly
    // the preview/delivery drift this test exists to catch.
    const catalogKeys = personalizationFieldsForDomain("hackathon")
      .filter((field) => field.startsWith("hackathon."))
      .map((field) => field.slice("hackathon.".length))
      .sort();

    expect(Object.keys(hackathon).sort()).toEqual(catalogKeys);
    // Populated, not merely present: `undefined` for every key would satisfy
    // the key check above while still delivering blank mail.
    for (const key of catalogKeys) {
      expect(hackathon[key as keyof typeof hackathon]).toBeTruthy();
    }
  });
});
