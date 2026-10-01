import { ok } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

function required<T>(value: T | undefined | null): T {
  ok(value);
  return value;
}

describe.skipIf(!canRunDatabaseTests())("hacker teams", () => {
  let disposable: DisposableDatabase | undefined;
  let db: typeof import("@forge/db/client").db;
  let schema: typeof import("@forge/db/schemas/knight-hacks");
  let auth: typeof import("@forge/db/schemas/auth");
  let teams: typeof import("../../utils/hacker-teams/teams");
  let checkIn: typeof import("../../utils/hackathon-events/check-in").performHackathonEventCheckIn;
  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_hacker_teams");
    vi.stubEnv("DATABASE_URL", disposable.url);
    ({ db } = await import("@forge/db/client"));
    schema = await import("@forge/db/schemas/knight-hacks");
    auth = await import("@forge/db/schemas/auth");
    teams = await import("../../utils/hacker-teams/teams");
    ({ performHackathonEventCheckIn: checkIn } =
      await import("../../utils/hackathon-events/check-in"));
  }, 120000);
  afterAll(async () => {
    await db.$client.end();
    await disposable?.drop();
    vi.unstubAllEnvs();
  }, 30000);
  async function fixture(classCount = 6) {
    const hackathonId = randomUUID(),
      eventId = randomUUID();
    await db.insert(schema.Hackathon).values({
      id: hackathonId,
      name: hackathonId,
      displayName: "Team Hack",
      theme: "Forest",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-04"),
      generalHackerDiscordRoleId: "990000000000000001",
    });
    const classes = Array.from({ length: classCount }, (_, i) => ({
      id: randomUUID(),
      hackathonId,
      name: `${i < 3 ? "Bloom" : "Blight"} ${i + 1}`,
      kind: "class" as const,
      color: "#112233",
      discordRoleId: `99000000000000001${i}`,
    }));
    await db.insert(schema.HackathonClass).values(classes);
    await db.insert(schema.Event).values({
      id: eventId,
      hackathonId,
      name: "Check-in",
      purpose: "primary_check_in",
      legacy: true,
      tag: "Hackathon",
      description: "Teams test",
      location: "Venue",
      start_datetime: new Date("2026-10-02"),
      end_datetime: new Date("2026-10-04"),
      points: 7,
    });
    const people: { userId: string; attendeeId: string }[] = [];
    for (let i = 0; i < 8; i++) {
      const userId = randomUUID(),
        attendeeId = randomUUID(),
        hackerId = randomUUID();
      await db.insert(auth.User).values({
        id: userId,
        discordUserId: userId,
        name: `Hacker ${i}`,
        email: `${userId}@example.test`,
      });
      await db.insert(schema.Hacker).values({
        id: hackerId,
        userId,
        firstName: `Hacker${i}`,
        lastName: "Teammate",
        discordUser: userId,
        age: 21,
        email: `${userId}@example.test`,
        phoneNumber: userId,
        school: "University of Central Florida",
        levelOfStudy: "Undergraduate University (3+ year)",
        shirtSize: "M",
        dob: "2005-02-14",
        gradDate: "2028-05-01",
        survey1: "",
        survey2: "",
      });
      await db.insert(schema.HackerAttendee).values({
        id: attendeeId,
        hackerId,
        hackathonId,
        status: "confirmed",
        points: 0,
      });
      people.push({ userId, attendeeId });
    }
    const owner = required(people[0]);
    await teams.changeHackerTeam(owner.userId, hackathonId, {
      action: "create",
      name: "Forest Friends",
    });
    const team = required(
      (
        await teams.participantTeams(owner.userId, hackathonId, {
          query: "",
          page: 0,
        })
      ).ownTeam,
    );
    async function join(index: number) {
      const person = required(people[index]);
      await teams.changeHackerTeam(person.userId, hackathonId, {
        action: "request",
        teamId: team.id,
      });
      await teams.changeHackerTeam(owner.userId, hackathonId, {
        action: "decide",
        teamId: team.id,
        attendeeId: person.attendeeId,
        accept: true,
      });
    }
    const arrive = (index: number) =>
      checkIn({
        actor: { id: owner.userId, name: "Operator" },
        input: {
          source: "manual",
          calledClassId: null,
          hackathonId,
          eventId,
          attendeeId: required(people[index]).attendeeId,
        },
      });
    return { hackathonId, eventId, people, owner, team, join, arrive, classes };
  }
  it("balances eligible classes by global count after teammate distribution", async () => {
    const { selectTeamClass } =
      await import("../../utils/hacker-teams/allocation");
    const classes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const counts = new Map([
      ["a", 3],
      ["b", 8],
      ["c", 6],
    ]);
    expect(selectTeamClass(classes, counts)?.id).toBe("a");
    expect(selectTeamClass(classes, counts, new Map([["a", 1]]))?.id).toBe("c");
    expect(selectTeamClass(classes, counts, new Map(), "b")?.id).toBe("b");
    expect(
      selectTeamClass(
        classes,
        counts,
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 1],
        ]),
      )?.id,
    ).toBe("a");
  });

  it("prevents an account cascade from orphaning its team", async () => {
    const f = await fixture();
    await f.join(1);
    await expect(
      db.delete(auth.User).where(eq(auth.User.id, f.owner.userId)),
    ).rejects.toThrow();
    expect(
      await db.select().from(auth.User).where(eq(auth.User.id, f.owner.userId)),
    ).toHaveLength(1);
    const detail = required(
      (await teams.teamDetails(db, f.hackathonId, [f.team.id]))[0],
    );
    expect(detail.members.find((m) => m.owner)?.attendeeId).toBe(
      f.owner.attendeeId,
    );
    await teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
      action: "leave",
    });
    await expect(
      db.delete(auth.User).where(eq(auth.User.id, f.owner.userId)),
    ).resolves.toBeDefined();
  });

  it("enforces confirmation, hackathon scope, ownership, single membership, requests and search privacy", async () => {
    const f = await fixture();
    const second = await fixture();
    const person = required(f.people[1]);
    await expect(
      teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
        action: "create",
        name: "Duplicate",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      teams.changeHackerTeam(person.userId, f.hackathonId, {
        action: "request",
        teamId: second.team.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await teams.changeHackerTeam(person.userId, f.hackathonId, {
      action: "request",
      teamId: f.team.id,
    });
    const privateView = await teams.participantTeams(
      required(f.people[2]).userId,
      f.hackathonId,
      { query: "Hacker0", page: 0 },
    );
    expect(privateView.teams).toHaveLength(1);
    expect(privateView.teams[0]?.requests).toEqual([]);
    expect(JSON.stringify(privateView)).not.toContain("@example.test");
    await expect(
      teams.changeHackerTeam(person.userId, f.hackathonId, {
        action: "update",
        teamId: f.team.id,
        name: "Stolen",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await teams.changeHackerTeam(person.userId, f.hackathonId, {
      action: "cancel",
    });
    await teams.changeHackerTeam(person.userId, f.hackathonId, {
      action: "request",
      teamId: f.team.id,
    });
    await teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
      action: "decide",
      teamId: f.team.id,
      attendeeId: person.attendeeId,
      accept: false,
    });
    await db
      .update(schema.HackerAttendee)
      .set({ status: "pending" })
      .where(eq(schema.HackerAttendee.id, person.attendeeId));
    await expect(
      teams.participantTeams(person.userId, f.hackathonId, {
        query: "",
        page: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      teams.participantTeams(person.userId, second.hackathonId, {
        query: "",
        page: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("serializes last-seat approvals, leaves one owner, and deletes empty teams", async () => {
    const f = await fixture();
    await f.join(1);
    await f.join(2);
    for (const i of [3, 4])
      await teams.changeHackerTeam(
        required(f.people[i]).userId,
        f.hackathonId,
        {
          action: "request",
          teamId: f.team.id,
        },
      );
    const results = await Promise.allSettled(
      [3, 4].map((i) =>
        teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
          action: "decide",
          teamId: f.team.id,
          attendeeId: required(f.people[i]).attendeeId,
          accept: true,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
      action: "leave",
    });
    const detail = required(
      (
        await teams.teamDetails(db, f.hackathonId, [f.team.id], undefined, true)
      )[0],
    );
    expect(detail.members).toHaveLength(3);
    expect(detail.members.filter((m) => m.owner)).toHaveLength(1);
    for (const member of detail.members)
      await teams.changeHackerTeam(
        f.owner.userId,
        f.hackathonId,
        { action: "remove", teamId: f.team.id, attendeeId: member.attendeeId },
        true,
      );
    expect(await teams.teamDetails(db, f.hackathonId, [f.team.id])).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.HackerTeamMember)
        .where(eq(schema.HackerTeamMember.teamId, f.team.id)),
    ).toEqual([]);
  });
  it("assigns concurrent together arrivals the same class and retains it after owner departure", async () => {
    const f = await fixture();
    await f.join(1);
    await f.join(2);
    const results = await Promise.all([f.arrive(0), f.arrive(1)]);
    expect(results.every((r) => r.result.status === "checked_in")).toBe(true);
    const assignments = await db
      .select({ classId: schema.HackerAttendee.classId })
      .from(schema.HackerAttendee)
      .where(eq(schema.HackerAttendee.hackathonId, f.hackathonId));
    expect(
      new Set(assignments.map((r) => r.classId).filter(Boolean)).size,
    ).toBe(1);
    const classId = assignments.find((r) => r.classId)?.classId;
    await teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
      action: "leave",
    });
    await f.arrive(2);
    const [late] = await db
      .select()
      .from(schema.HackerAttendee)
      .where(eq(schema.HackerAttendee.id, required(f.people[2]).attendeeId));
    expect(late?.classId).toBe(classId);
    await expect(
      teams.changeHackerTeam(required(f.people[3]).userId, f.hackathonId, {
        action: "request",
        teamId: f.team.id,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const detail = required(
      (await teams.teamDetails(db, f.hackathonId, [f.team.id]))[0],
    );
    expect(detail.frozen).toBe(true);
    const newOwner = required(
      f.people.find(
        (p) => detail.members.find((m) => m.owner)?.attendeeId === p.attendeeId,
      ),
    );
    await expect(
      teams.changeHackerTeam(newOwner.userId, f.hackathonId, {
        action: "update",
        teamId: f.team.id,
        name: "Forest",
        together: false,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await f.arrive(2)).result.status).toBe("already_checked_in");
    const [again] = await db
      .select()
      .from(schema.HackerAttendee)
      .where(eq(schema.HackerAttendee.id, required(f.people[2]).attendeeId));
    expect(again?.points).toBe(7);
    await expect(
      teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
        action: "create",
        name: "Already arrived",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it.each([6, 2])(
    "spreads four members across %i classes before global balance",
    async (classCount) => {
      const f = await fixture(classCount);
      await f.join(1);
      await f.join(2);
      await f.join(3);
      await teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
        action: "update",
        teamId: f.team.id,
        name: "Staggered",
        together: false,
      });
      await Promise.all([0, 1, 2, 3].map(f.arrive));
      const rows = await db
        .select()
        .from(schema.HackerAttendee)
        .where(eq(schema.HackerAttendee.hackathonId, f.hackathonId));
      const counts = new Map<string, number>();
      for (const r of rows)
        if (r.classId) counts.set(r.classId, (counts.get(r.classId) ?? 0) + 1);
      expect(counts.size).toBe(Math.min(4, classCount));
      expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBe(
        0,
      );
    },
  );
  it("has a serial result when approval races with first check-in", async () => {
    const f = await fixture();
    const p = required(f.people[1]);
    await teams.changeHackerTeam(p.userId, f.hackathonId, {
      action: "request",
      teamId: f.team.id,
    });
    const results = await Promise.allSettled([
      f.arrive(0),
      teams.changeHackerTeam(f.owner.userId, f.hackathonId, {
        action: "decide",
        teamId: f.team.id,
        attendeeId: p.attendeeId,
        accept: true,
      }),
    ]);
    expect(results[0].status).toBe("fulfilled");
    const detail = required(
      (
        await teams.teamDetails(db, f.hackathonId, [f.team.id], undefined, true)
      )[0],
    );
    expect(detail.frozen).toBe(true);
    expect(detail.requests).toEqual([]);
    expect(detail.members.length).toBe(
      results[1].status === "fulfilled" ? 2 : 1,
    );
  });
  it("filters class preferences before pagination and combines them with search", async () => {
    const f = await fixture();
    await db.insert(schema.HackerTeam).values([
      ...Array.from({ length: 21 }, (_, i) => ({
        id: randomUUID(),
        hackathonId: f.hackathonId,
        name: `A together ${i}`,
        together: true,
      })),
      {
        id: randomUUID(),
        hackathonId: f.hackathonId,
        name: "Z separate",
        together: false,
      },
    ]);
    const separate = await teams.searchHackerTeams(
      f.hackathonId,
      "",
      0,
      undefined,
      true,
      false,
    );
    expect(separate.teams.map((team) => team.name)).toEqual(["Z separate"]);
    expect(separate.hasMore).toBe(false);
    const together = await teams.searchHackerTeams(
      f.hackathonId,
      "",
      0,
      undefined,
      true,
      true,
    );
    expect(together.teams).toHaveLength(20);
    expect(together.teams.every((team) => team.together)).toBe(true);
    expect(together.hasMore).toBe(true);
    expect(
      (
        await teams.searchHackerTeams(
          f.hackathonId,
          "",
          1,
          undefined,
          true,
          true,
        )
      ).teams,
    ).toHaveLength(2);
    expect(
      (
        await teams.searchHackerTeams(
          f.hackathonId,
          "Forest",
          0,
          undefined,
          true,
          false,
        )
      ).teams,
    ).toEqual([]);
    expect(
      (
        await teams.searchHackerTeams(
          f.hackathonId,
          "Forest",
          0,
          undefined,
          true,
          true,
        )
      ).teams.map((team) => team.id),
    ).toEqual([f.team.id]);
  });
  it("requires explicit read/edit grants for organizers and audits changes", async () => {
    const f = await fixture();
    const { createCallerFactory, createTRPCRouter } =
      await import("../../trpc");
    const { hackerTeamRouter } = await import("../../routers/hacker-team");
    async function caller(
      index: number,
      key: "READ_HACKERS" | "EDIT_HACKERS" | "IS_OFFICER",
    ) {
      const p = required(f.people[index]);
      const roleId = randomUUID();
      await db.insert(auth.Roles).values({
        id: roleId,
        name: key,
        discordRoleId: roleId,
        permissions: permissionBitstring(key),
      });
      await db.insert(auth.Permissions).values({ userId: p.userId, roleId });
      const [user] = await db
        .select()
        .from(auth.User)
        .where(eq(auth.User.id, p.userId));
      if (!user) throw new Error("Fixture missing");
      const session: Session = {
        user: {
          ...user,
          name: user.name ?? "Hacker",
          email: user.email ?? "hacker@example.test",
        },
        session: {
          id: randomUUID(),
          token: randomUUID(),
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          ipAddress: null,
          userAgent: "vitest",
        },
      };
      return createCallerFactory(createTRPCRouter(hackerTeamRouter))({
        session,
        headers: new Headers(),
        source: "teams-test",
      });
    }
    const read = await caller(5, "READ_HACKERS"),
      edit = await caller(6, "EDIT_HACKERS"),
      officer = await caller(7, "IS_OFFICER");
    expect(
      (await read.list({ hackathonId: f.hackathonId })).teams,
    ).toHaveLength(1);
    expect(
      (await read.list({ hackathonId: f.hackathonId, together: true })).teams,
    ).toHaveLength(1);
    expect(
      (await read.list({ hackathonId: f.hackathonId, together: false })).teams,
    ).toEqual([]);
    await expect(
      read.change({
        hackathonId: f.hackathonId,
        change: { action: "delete", teamId: f.team.id },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      officer.list({ hackathonId: f.hackathonId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await edit.change({
      hackathonId: f.hackathonId,
      change: { action: "update", teamId: f.team.id, name: "Renamed" },
    });
    await expect(
      edit.change({
        hackathonId: f.hackathonId,
        change: {
          action: "update",
          teamId: f.team.id,
          name: "Override",
          together: false,
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const audit = await import("@forge/db/schemas/audit");
    const entries = await db
      .select()
      .from(audit.AdminAuditEvent)
      .where(eq(audit.AdminAuditEvent.actionKey, "hacker_team.changed"));
    expect(entries.length).toBeGreaterThan(0);
  });
});
