import { describe, expect, it } from "vitest";

import {
  emptyDraft,
  parseDraftLinks,
} from "~/app/_components/admin/issues/issue-draft";

describe("Issue draft shape", () => {
  it("seeds an empty draft with the club default due time and no team", () => {
    const draft = emptyDraft();

    expect(draft).toMatchObject({
      assigneeIds: [],
      children: [],
      description: "",
      dueDate: "",
      dueTime: "23:00",
      eventMode: "none",
      links: "",
      priority: "Medium",
      status: "Backlog",
      team: "",
      teamVisibilityIds: [],
    });
  });

  it("mints a distinct creation key per draft", () => {
    expect(emptyDraft().creationKey).not.toBe(emptyDraft().creationKey);
  });

  it("seeds the owning team when the dialog knows one", () => {
    expect(emptyDraft("team-a").team).toBe("team-a");
  });

  it("does not share array instances between drafts", () => {
    const first = emptyDraft();
    first.assigneeIds.push("someone");

    expect(emptyDraft().assigneeIds).toEqual([]);
  });
});

describe("External link parsing", () => {
  it("splits one link per line and trims pasted whitespace", () => {
    expect(parseDraftLinks("  https://one.test  \nhttps://two.test\t")).toEqual(
      ["https://one.test", "https://two.test"],
    );
  });

  it("handles CRLF line endings from Windows clipboards", () => {
    expect(parseDraftLinks("https://one.test\r\nhttps://two.test")).toEqual([
      "https://one.test",
      "https://two.test",
    ]);
  });

  it("drops blank and whitespace-only lines rather than sending empties", () => {
    expect(
      parseDraftLinks("\n\nhttps://one.test\n   \n\nhttps://two.test\n"),
    ).toEqual(["https://one.test", "https://two.test"]);
  });

  it("returns nothing for an untouched textarea", () => {
    expect(parseDraftLinks("")).toEqual([]);
    expect(parseDraftLinks("   \n\t\n")).toEqual([]);
  });
});
