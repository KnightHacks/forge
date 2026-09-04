import { afterEach, describe, expect, it, vi } from "vitest";

import type { TemplateBody } from "~/app/_components/admin/issues/issue-template-application";
import { emptyDraft } from "~/app/_components/admin/issues/issue-draft";
import {
  applyTemplateToDraft,
  materializeTemplateChildren,
  relativeTemplateDueAt,
  replaceTemplateTokens,
  templateNeedsInput,
} from "~/app/_components/admin/issues/issue-template-application";

/** Noon Eastern on 2026-07-15, comfortably inside a single club-time day. */
function freezeClubDay(instant: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
}

afterEach(() => {
  vi.useRealTimers();
});

const node = (body: Partial<TemplateBody> = {}): TemplateBody => ({
  description: "",
  name: "Node",
  priority: "Medium",
  status: "Backlog",
  team: "template-team",
  ...body,
});

/**
 * The mutation's recursive child input infers as `{}` through
 * `inferRouterInputs`, so the assertions below read the produced tree through a
 * concrete shape instead of an opaque one.
 */
interface MaterializedChild {
  assigneeIds: string[];
  children: MaterializedChild[];
  dueAt: string | undefined;
  eventId: string | undefined;
  links: string[];
  name: string;
  team: string;
  teamVisibilityIds: string[];
}

function materialize(...args: Parameters<typeof materializeTemplateChildren>) {
  return materializeTemplateChildren(...args) as unknown as MaterializedChild[];
}

describe("Template relative due dates", () => {
  it("leaves an undated template node undated", () => {
    expect(relativeTemplateDueAt(undefined)).toBeUndefined();
  });

  it("dates day zero at the club default due time today", () => {
    freezeClubDay("2026-07-15T16:00:00.000Z");

    expect(relativeTemplateDueAt(0)).toBe("2026-07-16T03:00:00.000Z");
  });

  it("counts forward and backward from the club day", () => {
    freezeClubDay("2026-07-15T16:00:00.000Z");

    expect(relativeTemplateDueAt(7)).toBe("2026-07-23T03:00:00.000Z");
    expect(relativeTemplateDueAt(-1)).toBe("2026-07-15T03:00:00.000Z");
  });

  it("counts from the club day, not the UTC day", () => {
    // 22:00 Eastern on the 15th is already the 16th in UTC.
    freezeClubDay("2026-07-16T02:00:00.000Z");

    expect(relativeTemplateDueAt(0)).toBe("2026-07-16T03:00:00.000Z");
  });

  it("keeps 11pm Eastern across a daylight-saving change", () => {
    freezeClubDay("2026-10-30T16:00:00.000Z");

    // 2026-11-04 is standard time, so the same wall clock is an hour later UTC.
    expect(relativeTemplateDueAt(5)).toBe("2026-11-05T04:00:00.000Z");
  });

  it("rolls over month boundaries", () => {
    freezeClubDay("2026-07-30T16:00:00.000Z");

    expect(relativeTemplateDueAt(3)).toBe("2026-08-03T03:00:00.000Z");
  });
});

describe("Template token substitution", () => {
  it("replaces every occurrence of both tokens", () => {
    expect(
      replaceTemplateTokens(
        "{INPUT}: brief {PARENT} for {INPUT}",
        "Kickoff",
        "Fall",
      ),
    ).toBe("Kickoff: brief Fall for Kickoff");
  });

  it("leaves text with no tokens untouched", () => {
    expect(replaceTemplateTokens("Plain title", "Kickoff", "Fall")).toBe(
      "Plain title",
    );
  });

  it("substitutes an empty parent at the template root", () => {
    expect(replaceTemplateTokens("{PARENT} follow-up", "Kickoff", "")).toBe(
      " follow-up",
    );
  });

  it("finds the input token anywhere in the tree", () => {
    expect(templateNeedsInput(node({ name: "Static" }))).toBe(false);
    expect(templateNeedsInput(node({ name: "{INPUT}" }))).toBe(true);
    expect(templateNeedsInput(node({ description: "## {INPUT}" }))).toBe(true);
    expect(
      templateNeedsInput(
        node({ children: [node({ children: [node({ name: "{INPUT}" })] })] }),
      ),
    ).toBe(true);
  });
});

describe("Template child materialization", () => {
  it("resolves {PARENT} to the nearest parent, not the template root", () => {
    freezeClubDay("2026-07-15T16:00:00.000Z");

    const children = materialize(
      [
        node({
          children: [node({ name: "Confirm owner for {PARENT}" })],
          name: "Plan {INPUT}",
        }),
      ],
      { input: "Kickoff", parentName: "Kickoff", team: "owning-team" },
    );

    expect(children).toMatchObject([
      {
        children: [{ name: "Confirm owner for Plan Kickoff" }],
        name: "Plan Kickoff",
      },
    ]);
  });

  it("puts every descendant on the owning team, not the template's team", () => {
    const children = materialize([node({ children: [node()] })], {
      input: "Kickoff",
      parentName: "Kickoff",
      team: "owning-team",
    });

    expect(children).toMatchObject([
      { children: [{ team: "owning-team" }], team: "owning-team" },
    ]);
  });

  it("defaults the fields a template node may omit", () => {
    const children = materialize([node()], {
      input: "Kickoff",
      parentName: "Kickoff",
      team: "owning-team",
    });

    expect(children[0]).toMatchObject({
      assigneeIds: [],
      children: [],
      eventId: undefined,
      links: [],
      teamVisibilityIds: [],
    });
    expect(children[0]?.dueAt).toBeUndefined();
  });

  it("dates only the nodes that ask for a relative due date", () => {
    freezeClubDay("2026-07-15T16:00:00.000Z");

    const children = materialize([node({ relativeDueDays: 2 }), node()], {
      input: "Kickoff",
      parentName: "Kickoff",
      team: "owning-team",
    });

    expect(children[0]?.dueAt).toBe("2026-07-18T03:00:00.000Z");
    expect(children[1]?.dueAt).toBeUndefined();
  });

  it("materializes nothing for a childless template", () => {
    expect(
      materializeTemplateChildren([], {
        input: "Kickoff",
        parentName: "Kickoff",
        team: "owning-team",
      }),
    ).toEqual([]);
  });

  it("removes managed image references copied into child descriptions", () => {
    const attachmentId = "f1490a89-24c2-4d1e-bad7-a90182b61bfd";
    const children = materialize(
      [
        node({
          description: `Before\n\n![Board](/_managed/issue-images/${attachmentId})\n\nAfter`,
        }),
      ],
      { input: "Kickoff", parentName: "Kickoff", team: "owning-team" },
    );

    expect(children[0]).toMatchObject({ description: "Before\n\nAfter" });
  });
});

describe("Applying a template to a draft", () => {
  const body = node({
    children: [node({ name: "Confirm owner for {PARENT}" })],
    description: "## Goal\n\n{INPUT}",
    name: "{INPUT}",
    priority: "Highest",
    status: "Planning",
  });

  it("overwrites the root fields and splits the due date into Eastern parts", () => {
    const draft = { ...emptyDraft("owning-team"), dueDate: "", dueTime: "" };

    const next = applyTemplateToDraft(draft, {
      body,
      input: "Fall kickoff",
      rootDueAt: "2026-07-23T03:00:00.000Z",
      team: "owning-team",
    });

    expect(next).toMatchObject({
      description: "## Goal\n\nFall kickoff",
      dueDate: "2026-07-22",
      dueTime: "23:00",
      name: "Fall kickoff",
      priority: "Highest",
      status: "Planning",
      team: "owning-team",
    });
    expect(next.children).toMatchObject([
      { name: "Confirm owner for Fall kickoff" },
    ]);
  });

  it("keeps the draft's own due date when the template has no relative date", () => {
    const draft = {
      ...emptyDraft("owning-team"),
      dueDate: "2026-08-01",
      dueTime: "09:30",
    };

    const next = applyTemplateToDraft(draft, {
      body,
      input: "Fall kickoff",
      rootDueAt: undefined,
      team: "owning-team",
    });

    expect(next).toMatchObject({ dueDate: "2026-08-01", dueTime: "09:30" });
  });

  it("keeps existing assignees and shared teams a template does not name", () => {
    const draft = {
      ...emptyDraft("owning-team"),
      assigneeIds: ["member-1"],
      teamVisibilityIds: ["team-b"],
    };

    const next = applyTemplateToDraft(draft, {
      body,
      input: "Fall kickoff",
      rootDueAt: undefined,
      team: "owning-team",
    });

    expect(next.assigneeIds).toEqual(["member-1"]);
    expect(next.teamVisibilityIds).toEqual(["team-b"]);
  });

  it("prefers the assignees and shared teams the template does name", () => {
    const draft = {
      ...emptyDraft("owning-team"),
      assigneeIds: ["member-1"],
      teamVisibilityIds: ["team-b"],
    };

    const next = applyTemplateToDraft(draft, {
      body: node({ ...body, assigneeIds: [], teamVisibilityIds: ["team-c"] }),
      input: "Fall kickoff",
      rootDueAt: undefined,
      team: "owning-team",
    });

    expect(next.assigneeIds).toEqual([]);
    expect(next.teamVisibilityIds).toEqual(["team-c"]);
  });

  it("leaves the fields a template has no opinion about alone", () => {
    const draft = {
      ...emptyDraft("owning-team"),
      eventId: "event-1",
      eventMode: "link" as const,
      links: "https://one.test",
      parentId: "issue-1",
      templateId: "template-a",
    };

    const next = applyTemplateToDraft(draft, {
      body,
      input: "Fall kickoff",
      rootDueAt: undefined,
      team: "owning-team",
    });

    expect(next).toMatchObject({
      creationKey: draft.creationKey,
      eventId: "event-1",
      eventMode: "link",
      links: "https://one.test",
      parentId: "issue-1",
      templateId: "template-a",
    });
  });

  it("removes managed image references copied into the root description", () => {
    const attachmentId = "f1490a89-24c2-4d1e-bad7-a90182b61bfd";
    const next = applyTemplateToDraft(emptyDraft("owning-team"), {
      body: node({
        description: `Goal\n\n![Board](/_managed/issue-images/${attachmentId})`,
      }),
      input: "Fall kickoff",
      rootDueAt: undefined,
      team: "owning-team",
    });

    expect(next.description).toBe("Goal");
  });
});
