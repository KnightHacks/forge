import { describe, expect, it } from "vitest";

import {
  emailAudienceDefinitionSchema,
  emailConfirmSendSchema,
  emailPreviewSendSchema,
  emailSaveTemplateSchema,
  emailSendTestSchema,
} from "../email";

const sendContent = {
  mode: "plainText" as const,
  plainText: "Hello from Knight Hacks",
  subject: "A real subject",
};

describe("Email Portal validators", () => {
  it("TC-012 accepts stable hackathon IDs and supported statuses", () => {
    expect(
      emailAudienceDefinitionSchema.parse({
        hackathonId: "00000000-0000-4000-8000-000000000012",
        kind: "hackathon",
        statuses: ["confirmed", "pending", "withdrawn", "denied"],
      }),
    ).toEqual({
      hackathonId: "00000000-0000-4000-8000-000000000012",
      kind: "hackathon",
      statuses: ["confirmed", "pending", "withdrawn", "denied"],
    });
  });

  it("accepts a stable role ID as an audience", () => {
    expect(
      emailAudienceDefinitionSchema.parse({
        kind: "role",
        roleId: "00000000-0000-4000-8000-000000000013",
      }),
    ).toEqual({
      kind: "role",
      roleId: "00000000-0000-4000-8000-000000000013",
    });
  });

  it.each([
    { kind: "sql", query: "select * from members" },
    { kind: "hackathon", hackathonId: "not-a-uuid" },
    { kind: "role", roleId: "not-a-uuid" },
    {
      hackathonId: "00000000-0000-4000-8000-000000000012",
      kind: "hackathon",
      statuses: ["approved"],
    },
    { kind: "current_members", table: "Member" },
  ])("TC-NEG-004 rejects invalid audience input %#", (input) => {
    expect(() => emailAudienceDefinitionSchema.parse(input)).toThrow();
  });

  it("TC-020 validates plain-text composition without requiring HTML", () => {
    expect(
      emailPreviewSendSchema.parse({
        audiences: [{ kind: "current_members" }],
        content: sendContent,
        scheduledFor: null,
      }),
    ).toMatchObject({ content: sendContent, excludedRecipients: [] });
  });

  it("TC-017 normalizes and validates manually excluded recipient emails", () => {
    expect(
      emailPreviewSendSchema.parse({
        audiences: [{ kind: "current_members" }],
        content: sendContent,
        excludedRecipients: [" ADA@EXAMPLE.TEST "],
        scheduledFor: null,
      }).excludedRecipients,
    ).toEqual(["ada@example.test"]);
    expect(() =>
      emailPreviewSendSchema.parse({
        audiences: [{ kind: "current_members" }],
        content: sendContent,
        excludedRecipients: ["ada@example.test", "ADA@example.test"],
        scheduledFor: null,
      }),
    ).toThrow(/duplicates/i);
  });

  it("TC-NEG-005 requires the displayed count and preview version at confirm", () => {
    expect(
      emailConfirmSendSchema.parse({
        expectedRecipientCount: 42,
        previewVersion: "pv_01J00000000000000000000000",
        sendId: "00000000-0000-4000-8000-000000000005",
      }),
    ).toMatchObject({ expectedRecipientCount: 42 });
    expect(() =>
      emailConfirmSendSchema.parse({
        previewVersion: "pv_01J00000000000000000000000",
        sendId: "00000000-0000-4000-8000-000000000005",
      }),
    ).toThrow();
  });

  it.each(["yesterday", "2026-13-01T00:00:00.000Z", "2026-08-01 12:00"])(
    "TC-NEG-006 rejects malformed schedules: %s",
    (scheduledFor) => {
      expect(() =>
        emailPreviewSendSchema.parse({
          audiences: [{ kind: "current_members" }],
          content: sendContent,
          scheduledFor,
        }),
      ).toThrow();
    },
  );

  it("TC-032 exposes no recipient field on the test-send input", () => {
    expect(
      emailSendTestSchema.parse({
        content: sendContent,
        sample: { recipient: { firstName: "Dylan" } },
      }),
    ).not.toHaveProperty("recipient");
    expect(() =>
      emailSendTestSchema.parse({
        content: sendContent,
        recipient: "person@example.test",
      }),
    ).toThrow();
  });

  it("TC-002 validates code-template drafts as source, not executable functions", () => {
    expect(
      emailSaveTemplateSchema.parse({
        domain: "club",
        kind: "code",
        name: "Welcome",
        source: `export default <Text>Hello</Text>;`,
      }),
    ).toMatchObject({ domain: "club", kind: "code", name: "Welcome" });
    expect(() =>
      emailSaveTemplateSchema.parse({
        domain: "club",
        kind: "code",
        name: "Welcome",
        render: () => "arbitrary code",
      }),
    ).toThrow();
  });

  it("requires a domain rather than defaulting it", () => {
    // A default made omission silent: the portal's save callback rebuilt the
    // payload field by field, dropped `domain`, and every save quietly reset
    // the template to club while reporting success. Required makes any caller
    // that forgets fail loudly — at compile time in TypeScript, and here.
    // Asserts the path, not just "throws": tightening some unrelated field
    // would otherwise keep this green while every save silently reset domain.
    const result = emailSaveTemplateSchema.safeParse({
      kind: "code",
      name: "Welcome",
      source: `export default <Text>Hello</Text>;`,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["domain"]);
  });

  it("keeps the hackathon domain it was given", () => {
    expect(
      emailSaveTemplateSchema.parse({
        domain: "hackathon",
        kind: "code",
        name: "Acceptance",
        source: `export default <Text>Hello</Text>;`,
      }),
    ).toMatchObject({ domain: "hackathon" });
  });
});
