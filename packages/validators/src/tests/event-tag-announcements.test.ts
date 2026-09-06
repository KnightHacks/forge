import { describe, expect, it } from "vitest";

import {
  eventTagCreateSchema,
  eventTagUpdateSchema,
} from "../event-management";
import {
  hackathonEventTagCreateSchema,
  hackathonEventTagUpdateSchema,
} from "../hackathon-events";

const TAG_ID = "00000000-0000-4000-8000-000000000501";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000502";
const tag = { color: "#9333EA", defaultPoints: 25, name: "Project Launch" };
const catalogs = [
  {
    name: "Club",
    create: eventTagCreateSchema,
    update: eventTagUpdateSchema,
    scope: {},
  },
  {
    name: "hackathon",
    create: hackathonEventTagCreateSchema,
    update: hackathonEventTagUpdateSchema,
    scope: { hackathonId: HACKATHON_ID },
  },
];

describe.each(catalogs)(
  "$name tag announcement settings",
  ({ create, update, scope }) => {
    it.each(["🚀", "👩🏽‍💻", "🇺🇸", "1️⃣"])(
      "accepts Unicode emoji sequence %s",
      (emoji) => {
        expect(create.parse({ ...tag, ...scope, emoji }).emoji).toBe(emoji);
        expect(update.parse({ ...scope, tagId: TAG_ID, emoji }).emoji).toBe(
          emoji,
        );
      },
    );

    it.each([
      "rocket",
      ":rocket:",
      "@everyone",
      "<:rocket:123456789012345678>",
      "🚀 text",
      "🚀".repeat(17),
    ])("rejects text, mentions, or oversized emoji input %s", (emoji) => {
      expect(create.safeParse({ ...tag, ...scope, emoji }).success).toBe(false);
      expect(update.safeParse({ ...scope, tagId: TAG_ID, emoji }).success).toBe(
        false,
      );
    });

    it.each(["12345678901234567", "12345678901234567890"])(
      "accepts channel snowflake %s",
      (announcementChannelId) => {
        expect(
          create.parse({ ...tag, ...scope, announcementChannelId })
            .announcementChannelId,
        ).toBe(announcementChannelId);
        expect(
          update.parse({ ...scope, tagId: TAG_ID, announcementChannelId })
            .announcementChannelId,
        ).toBe(announcementChannelId);
      },
    );

    it.each([
      "",
      "12345",
      "#announcements",
      "<#123456789012345678>",
      "123456789012345678 ",
      "1".repeat(21),
    ])("rejects malformed channel ID %s", (announcementChannelId) => {
      expect(
        create.safeParse({ ...tag, ...scope, announcementChannelId }).success,
      ).toBe(false);
      expect(
        update.safeParse({ ...scope, tagId: TAG_ID, announcementChannelId })
          .success,
      ).toBe(false);
    });

    it("accepts explicit null clearing without requiring a name or other template change", () => {
      expect(
        update.parse({ ...scope, tagId: TAG_ID, emoji: null }),
      ).toMatchObject({ emoji: null });
      expect(
        update.parse({ ...scope, tagId: TAG_ID, announcementChannelId: null }),
      ).toMatchObject({ announcementChannelId: null });
      expect(
        create.parse({
          ...tag,
          ...scope,
          emoji: null,
          announcementChannelId: null,
        }),
      ).toMatchObject({ emoji: null, announcementChannelId: null });
      expect(update.safeParse({ ...scope, tagId: TAG_ID }).success).toBe(false);
    });
  },
);

describe("Skip Next Week is a Club schedule setting", () => {
  it.each([true, false])(
    "allows a Club setting-only update to %s",
    (skipNextWeek) => {
      expect(
        eventTagUpdateSchema.parse({ tagId: TAG_ID, skipNextWeek }),
      ).toEqual({ tagId: TAG_ID, skipNextWeek });
      expect(
        eventTagCreateSchema.parse({ ...tag, skipNextWeek }).skipNextWeek,
      ).toBe(skipNextWeek);
    },
  );

  it("does not expose the weekly setting in hackathon create or update inputs", () => {
    expect(
      hackathonEventTagCreateSchema.safeParse({
        ...tag,
        hackathonId: HACKATHON_ID,
        skipNextWeek: true,
      }).success,
    ).toBe(false);
    expect(
      hackathonEventTagUpdateSchema.safeParse({
        tagId: TAG_ID,
        hackathonId: HACKATHON_ID,
        skipNextWeek: false,
      }).success,
    ).toBe(false);
  });
});
