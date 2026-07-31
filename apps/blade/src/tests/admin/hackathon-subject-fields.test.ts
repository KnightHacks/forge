import { describe, expect, it } from "vitest";

import { personalizationFieldsForDomain } from "@forge/email/fields";

import {
  STATUS_COPY,
  SUBJECT_FIELDS,
  SUBJECT_FIELDS_WITHHELD,
} from "~/app/_components/admin/hackathon/status-copy";

/**
 * `SUBJECT_FIELDS` is the only place an officer can discover which placeholders
 * a subject line accepts, and it is a hand-written copy of a catalog that lives
 * in another package. Nothing connects the two, so the list had already drifted:
 * `recipient.email` was valid server-side and absent from the UI, meaning an
 * officer had no way to learn it existed.
 *
 * This is the connection. Adding a field to the catalog fails here until it is
 * either documented or explicitly withheld.
 */
describe("subject field guide", () => {
  it("documents every field the server will accept", () => {
    const documented = new Set<string>([
      ...SUBJECT_FIELDS.map((entry) => entry.field),
      ...SUBJECT_FIELDS_WITHHELD,
    ]);

    expect([...documented].sort()).toEqual(
      personalizationFieldsForDomain("hackathon"),
    );
  });

  it("does not document a field the server would reject", () => {
    const allowed = new Set(personalizationFieldsForDomain("hackathon"));

    for (const entry of SUBJECT_FIELDS) {
      expect(allowed.has(entry.field)).toBe(true);
    }
  });

  // Every example in the guide is copy an officer is invited to paste straight
  // into the subject box, so a typo in one is a typo shipped to an inbox.
  it("only uses documented placeholders in its own examples", () => {
    const allowed = new Set(personalizationFieldsForDomain("hackathon"));
    const examples = Object.values(STATUS_COPY).map((copy) => copy.example);

    for (const example of examples) {
      for (const [, field] of example.matchAll(/\{\{([^{}]*)\}\}/g)) {
        expect(allowed.has((field ?? "").trim())).toBe(true);
      }
    }
  });
});
