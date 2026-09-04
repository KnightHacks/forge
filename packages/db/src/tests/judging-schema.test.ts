import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  GuestJudgeSession,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
} from "../schemas/knight-hacks";

describe("judging room storage", () => {
  it("keeps room, judge, link, session, and presence as separate records", () => {
    expect(JudgingRoom.id).toBeDefined();
    expect(Judge.id).toBeDefined();
    expect(JudgingRoomAccessLink.id).toBeDefined();
    expect(GuestJudgeSession.id).toBeDefined();
    expect(JudgingRoomPresence.id).toBeDefined();
  });

  it("scopes a room challenge to its hackathon", () => {
    const foreignKeys = getTableConfig(JudgingRoom).foreignKeys.map((key) => {
      const reference = key.reference();
      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        name: key.getName(),
      };
    });

    expect(foreignKeys).toContainEqual({
      columns: ["challengeId", "hackathonId"],
      foreignColumns: ["id", "hackathonId"],
      name: "knight_hacks_judging_room_challenge_scope_fk",
    });
  });

  it("scopes guest sessions to both their access link and judge hackathon", () => {
    const foreignKeys = getTableConfig(GuestJudgeSession).foreignKeys.map(
      (key) => key.getName(),
    );
    expect(foreignKeys).toContain(
      "knight_hacks_guest_judge_session_access_link_scope_fk",
    );
    expect(foreignKeys).toContain(
      "knight_hacks_guest_judge_session_judge_scope_fk",
    );
  });

  it("enforces one active room presence and one active link", () => {
    expect(
      getTableConfig(JudgingRoomAccessLink).indexes.some(
        (index) =>
          index.config.name ===
            "knight_hacks_judging_room_access_link_active_room_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
    expect(
      getTableConfig(JudgingRoomPresence).indexes.some(
        (index) =>
          index.config.name ===
            "knight_hacks_judging_room_presence_active_judge_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
  });
});
