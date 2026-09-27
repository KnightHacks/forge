import { describe, expect, it, vi } from "vitest";

import { validateActionPayload } from "../../utils/audit/service";

vi.mock("@forge/db/client", () => ({ db: {} }));

const channel = "1284582557689843785";
const hackathonId = "00000000-0000-4000-8000-000000000502";
const settings = { emoji: "🚀", announcementChannelId: channel };
const tag = { name: "Project Launch", color: "#9333ea", defaultPoints: 25 };
const clearedSettings = [
  { field: "emoji", before: "🚀", after: null },
  { field: "announcementChannelId", before: channel, after: null },
];

describe("event tag announcement audit contracts", () => {
  it("accepts Club create metadata with announcement settings", () => {
    const metadata = { ...tag, ...settings, skipNextWeek: true };
    expect(
      validateActionPayload("event.tag.created", metadata, []).parsedMetadata,
    ).toEqual(metadata);
  });

  it("accepts Club update changes that clear optional fields and turn off Skip Next Week", () => {
    const changes = [
      ...clearedSettings,
      { field: "skipNextWeek", before: true, after: false },
    ];
    expect(
      validateActionPayload("event.tag.updated", {}, changes).parsedChanges,
    ).toEqual(changes);
  });

  it("accepts hackathon create metadata with its scoped announcement settings", () => {
    const metadata = {
      ...tag,
      ...settings,
      creationSource: "manual",
      targetHackathonId: hackathonId,
    };
    expect(
      validateActionPayload("hackathon_event.tag.created", metadata, [])
        .parsedMetadata,
    ).toEqual(metadata);
  });

  it("accepts hackathon update changes that clear the emoji and destination", () => {
    expect(
      validateActionPayload("hackathon_event.tag.updated", {}, clearedSettings)
        .parsedChanges,
    ).toEqual(clearedSettings);
  });

  it("keeps the Club-only weekly setting outside hackathon audit payloads", () => {
    expect(() =>
      validateActionPayload(
        "hackathon_event.tag.created",
        { ...tag, skipNextWeek: true },
        [],
      ),
    ).toThrow(/skipNextWeek.*not allowed/);
    expect(() =>
      validateActionPayload("hackathon_event.tag.updated", {}, [
        { field: "skipNextWeek", before: true, after: false },
      ]),
    ).toThrow(/skipNextWeek.*not allowed/);
  });
});
