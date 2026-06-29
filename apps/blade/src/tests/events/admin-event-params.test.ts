import { describe, expect, it } from "vitest";

import {
  buildAdminEventSearchParams,
  defaultAdminCalendarWindow,
  parseAdminEventSearchParams,
} from "~/app/_components/admin/events/params";

const EVENT_ID = "00000000-0000-4000-8000-000000000101";
const ROLE_ID = "00000000-0000-4000-8000-000000000201";

describe("admin event URL state", () => {
  it("builds a deterministic bounded default calendar window", () => {
    expect(
      defaultAdminCalendarWindow(new Date("2026-08-15T12:00:00.000Z")),
    ).toEqual({
      calendarEnd: "2026-09-15T12:00:00.000Z",
      calendarStart: "2026-07-15T12:00:00.000Z",
    });
  });

  it("defaults past event lists to newest first", () => {
    const parsed = parseAdminEventSearchParams({ timing: "past" });

    expect(parsed.input.direction).toBe("desc");
    expect(
      buildAdminEventSearchParams(parsed.input, null).get("direction"),
    ).toBeNull();
  });

  it("TC-006 parses list filters, paging, sorting, and a shareable detail", () => {
    const result = parseAdminEventSearchParams({
      audience: ["public", "dues"],
      direction: "desc",
      end: "2026-08-31",
      event: EVENT_ID,
      health: ["error", "unknown"],
      internal: "internal",
      page: "3",
      pageSize: "100",
      q: "workshop",
      role: ROLE_ID,
      sort: "attendance",
      start: "2026-08-01",
      tag: ["GBM", "Workshop"],
      timing: "upcoming",
      view: "list",
    });

    expect(result.input).toMatchObject({
      audiences: ["public", "dues"],
      direction: "desc",
      endDate: "2026-08-31",
      health: ["error", "unknown"],
      internal: "internal",
      page: 3,
      pageSize: 100,
      query: "workshop",
      roleIds: [ROLE_ID],
      sort: "attendance",
      startDate: "2026-08-01",
      tags: ["GBM", "Workshop"],
      timing: "upcoming",
      view: "list",
    });
    expect(result.selectedEventId).toBe(EVENT_ID);
  });

  it("TC-006 preserves bounded calendar state without discarding list paging", () => {
    const parsed = parseAdminEventSearchParams({
      calendarEnd: "2026-09-01T04:00:00.000Z",
      calendarStart: "2026-08-01T04:00:00.000Z",
      page: "4",
      pageSize: "50",
      tag: "Workshop",
      view: "calendar",
    });
    const params = buildAdminEventSearchParams(
      parsed.input,
      parsed.selectedEventId,
    );

    expect(parsed.input).toMatchObject({
      calendarEnd: "2026-09-01T04:00:00.000Z",
      calendarStart: "2026-08-01T04:00:00.000Z",
      page: 4,
      pageSize: 50,
      tags: ["Workshop"],
      view: "calendar",
    });
    expect(params.get("page")).toBe("4");
    expect(params.get("pageSize")).toBe("50");
    expect(params.get("calendarStart")).toBe("2026-08-01T04:00:00.000Z");
    expect(params.get("calendarEnd")).toBe("2026-09-01T04:00:00.000Z");
  });

  it("TC-005 TC-006 rejects malformed state and uses safe defaults", () => {
    const result = parseAdminEventSearchParams({
      audience: "everyone",
      calendarEnd: "not-a-date",
      direction: "sideways",
      event: "not-a-uuid",
      health: "broken-ish",
      internal: "sometimes",
      page: "zero",
      pageSize: "13",
      role: "not-a-uuid",
      sort: "created",
      timing: "whenever",
      view: "tags",
    });

    expect(result.input).toMatchObject({
      audiences: [],
      direction: "asc",
      health: [],
      page: 1,
      pageSize: 25,
      roleIds: [],
      sort: "start",
      tags: [],
      timing: "upcoming",
      view: "tags",
    });
    expect(result.selectedEventId).toBeNull();
  });

  it("TC-006 serializes repeated filters deterministically and omits defaults", () => {
    const parsed = parseAdminEventSearchParams({
      audience: ["roles", "dues"],
      health: ["unknown", "error"],
      role: [
        "00000000-0000-4000-8000-000000000203",
        "00000000-0000-4000-8000-000000000202",
      ],
      tag: ["Workshop", "GBM"],
    });
    const params = buildAdminEventSearchParams(parsed.input, EVENT_ID);

    expect(params.get("page")).toBeNull();
    expect(params.get("pageSize")).toBeNull();
    expect(params.getAll("audience")).toEqual(["dues", "roles"]);
    expect(params.getAll("health")).toEqual(["error", "unknown"]);
    expect(params.getAll("role")).toEqual([
      "00000000-0000-4000-8000-000000000202",
      "00000000-0000-4000-8000-000000000203",
    ]);
    expect(params.getAll("tag")).toEqual(["GBM", "Workshop"]);
    expect(params.get("event")).toBe(EVENT_ID);
  });
});
