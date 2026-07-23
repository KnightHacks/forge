import { describe, expect, it, vi } from "vitest";

import { issuesRouter } from "../../routers/issues";

vi.mock("@forge/db/client", () => ({ db: {} }));

describe("Club Operations Issues router contract", () => {
  it("TC-API-001 exposes discovery, lifecycle, history, archive, and choices", () => {
    expect(Object.keys(issuesRouter).sort()).toEqual(
      [
        "archive",
        "create",
        "createTemplate",
        "disableTemplate",
        "get",
        "list",
        "listAssignees",
        "listEvents",
        "listHistory",
        "listTemplates",
        "listTeams",
        "restore",
        "update",
        "updateTemplate",
      ].sort(),
    );
  });
});
