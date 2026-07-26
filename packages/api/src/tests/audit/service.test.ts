import { describe, expect, it, vi } from "vitest";

import {
  validateActionPayload,
  validateSubjects,
} from "../../utils/audit/service";

vi.mock("@forge/db/client", () => ({ db: {} }));

describe("admin audit payload enforcement", () => {
  it("accepts only metadata and changed fields allowlisted for the action", () => {
    expect(() =>
      validateActionPayload("member.profile.updated", {}, [
        { after: 5, before: 4, field: "points" },
      ]),
    ).not.toThrow();
    expect(() =>
      validateActionPayload("member.profile.updated", { rawAnswers: "no" }, []),
    ).toThrow(/not allowed/i);
    expect(() =>
      validateActionPayload("member.profile.updated", {}, [
        { after: "secret", before: null, field: "password" },
      ]),
    ).toThrow(/not allowed/i);
  });

  it("requires exactly one primary subject", () => {
    expect(() =>
      validateSubjects("member.profile.updated", [
        {
          relation: "primary",
          targetId: "member-1",
          targetLabel: "Member One",
          targetType: "member",
        },
      ]),
    ).not.toThrow();
    expect(() => validateSubjects("member.profile.updated", [])).toThrow(
      /exactly one primary/i,
    );
  });
});
