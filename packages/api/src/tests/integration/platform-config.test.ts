import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { DISCORD } from "@forge/consts";
import { asc, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type ClubTeamSchemas = typeof import("@forge/db/schemas/club-team");
type DiscordConfigSchemas = typeof import("@forge/db/schemas/discord-config");
type AuditSchemas = typeof import("@forge/db/schemas/audit");

const OFFICER = {
  memberId: "20000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000001",
};
const HOLDER = {
  memberId: "20000000-0000-4000-8000-000000000002",
  userId: "10000000-0000-4000-8000-000000000002",
};
const OFFICER_ROLE = "30000000-0000-4000-8000-000000000001";
const DESIGN_ROLE = "30000000-0000-4000-8000-000000000002";
const MARKETING_ROLE = "30000000-0000-4000-8000-000000000003";
const ABSENT_ID = "30000000-0000-4000-8000-0000000000ff";

const auditControl = vi.hoisted(() => ({ failWrites: false }));

// TC-NEG-011 needs a failing audit write inside an otherwise valid mutation.
// Nothing an officer can submit produces one, so the service is wrapped rather
// than replaced: every other case in this file runs the real implementation and
// reads the rows it wrote.
vi.mock("../../utils/audit/service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../utils/audit/service")>();

  return {
    ...actual,
    createAdminAuditEvent: (
      ...args: Parameters<typeof actual.createAdminAuditEvent>
    ) => {
      if (auditControl.failWrites) {
        return Promise.reject(new Error("audit delivery failed"));
      }
      return actual.createAdminAuditEvent(...args);
    },
  };
});

/**
 * Every claim here is about SQL: `FOR UPDATE` serialisation, `ON CONFLICT`,
 * `ON DELETE cascade`, the two check constraints, and the joins
 * `getVisiblePublicClubRoster` runs. A mocked `db` verifies none of it.
 *
 * Skips rather than fails without a loopback `DATABASE_URL`, so a contributor
 * with no local Postgres still gets a green suite. Start one from the repo root
 * with `docker compose up -d`, then run with `DATABASE_URL=... pnpm test`.
 */
describe.runIf(canRunDatabaseTests())("platform configuration console", () => {
  let disposable: DisposableDatabase | undefined;

  // `@forge/db/client` builds its pool from DATABASE_URL at module load, and
  // the routers, the roster reader, and the config cache all import it, so none
  // can be imported before the disposable database exists.
  let client: DatabaseClient;
  let auth: AuthSchemas;
  let clubTeam: ClubTeamSchemas;
  let discordConfig: DiscordConfigSchemas;
  let audit: AuditSchemas;
  let console_: Awaited<ReturnType<typeof officerCaller>>;
  let getKnightHacksGuildId: typeof import("@forge/utils/discord-config").getKnightHacksGuildId;
  let getVisiblePublicClubRoster: typeof import("../../utils/guild/club-roster").getVisiblePublicClubRoster;

  async function officerCaller() {
    const trpc = await import("../../trpc");
    const { clubTeamsRouter } = await import("../../routers/club-teams");
    const { discordConfigRouter } =
      await import("../../routers/discord-config");
    const router = trpc.createTRPCRouter({
      clubTeams: clubTeamsRouter,
      discordConfig: discordConfigRouter,
    });

    return trpc.createCallerFactory(router)({
      headers: new Headers(),
      session: {
        user: { id: OFFICER.userId, name: "Officer" },
      } as Session,
      source: "platform-config-integration",
    });
  }

  function memberRow(
    actor: { memberId: string; userId: string },
    name: string,
  ) {
    return {
      age: 21,
      discordUser: `${name}#0001`,
      dob: "2003-01-01",
      email: `${name}@knighthacks.org`,
      firstName: name,
      gradDate: "2027-05-01",
      guildProfileVisible: true,
      id: actor.memberId,
      lastName: "Member",
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      school: "University of Central Florida" as const,
      shirtSize: "M" as const,
      userId: actor.userId,
    };
  }

  async function teamIdBySlug(slug: string) {
    const [team] = await client
      .select({ id: clubTeam.ClubTeam.id })
      .from(clubTeam.ClubTeam)
      .where(eq(clubTeam.ClubTeam.slug, slug));
    if (!team) throw new Error(`Seeded team "${slug}" is missing`);
    return team.id;
  }

  async function configRow(key: DISCORD.ConfigKey) {
    const [row] = await client
      .select()
      .from(discordConfig.DiscordConfig)
      .where(eq(discordConfig.DiscordConfig.key, key));
    if (!row) throw new Error(`Config row "${key}" is missing`);
    return row;
  }

  /** Team slugs holding at least one visible member, sorted. */
  function occupiedSlugs(roster: { members: Record<string, unknown[]> }) {
    return Object.entries(roster.members)
      .filter(([, members]) => members.length > 0)
      .map(([slug]) => slug)
      .sort();
  }

  async function auditEventsFor(actionKey: string) {
    return (
      client
        .select({
          id: audit.AdminAuditEvent.id,
          changes: audit.AdminAuditEvent.changes,
          metadata: audit.AdminAuditEvent.metadata,
        })
        .from(audit.AdminAuditEvent)
        .where(eq(audit.AdminAuditEvent.actionKey, actionKey))
        // Explicit: a heap scan returns rows in no defined order, and several
        // cases below read "the event this mutation just wrote" as the last one.
        .orderBy(asc(audit.AdminAuditEvent.occurredAt))
    );
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    clubTeam = await import("@forge/db/schemas/club-team");
    discordConfig = await import("@forge/db/schemas/discord-config");
    audit = await import("@forge/db/schemas/audit");
    ({ getKnightHacksGuildId } = await import("@forge/utils/discord-config"));
    ({ getVisiblePublicClubRoster } =
      await import("../../utils/guild/club-roster"));
    const knightHacks = await import("@forge/db/schemas/knight-hacks");

    await client.insert(auth.User).values([
      { discordUserId: "discord-officer", id: OFFICER.userId, name: "Officer" },
      { discordUserId: "discord-holder", id: HOLDER.userId, name: "Holder" },
    ]);
    await client.insert(auth.Roles).values([
      {
        discordRoleId: "990000000000000101",
        id: OFFICER_ROLE,
        name: "Officers",
        permissions: permissionBitstring("IS_OFFICER"),
      },
      {
        discordRoleId: "990000000000000102",
        id: DESIGN_ROLE,
        name: "KH Design",
        permissions: "",
      },
      {
        discordRoleId: "990000000000000103",
        id: MARKETING_ROLE,
        name: "Marketing Lead",
        permissions: "",
      },
    ]);
    await client.insert(auth.Permissions).values([
      { roleId: OFFICER_ROLE, userId: OFFICER.userId },
      { roleId: DESIGN_ROLE, userId: HOLDER.userId },
      { roleId: MARKETING_ROLE, userId: HOLDER.userId },
    ]);
    await client
      .insert(knightHacks.Member)
      .values([memberRow(OFFICER, "officer"), memberRow(HOLDER, "holder")]);

    console_ = await officerCaller();
  }, 120_000);

  afterAll(async () => {
    // Close the pool before dropping. `drop()` evicts leftover sessions as a
    // backstop, but a pool killed mid-connection emits an unhandled `57P01`.
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  describe("discordConfig.update", () => {
    it("TC-NEG-006: stores a cleared development snowflake as NULL", async () => {
      const before = await configRow("vip_role");

      const updated = await console_.discordConfig.update({
        acknowledgeGuildRepoint: false,
        description: before.description,
        // Whitespace-only, to prove the schema normalises rather than storing
        // a truthy blank. `NULL` is the documented "reuse productionId" value.
        developmentId: "   ",
        key: "vip_role",
        label: before.label,
        productionId: " 990000000000000201 ",
      });

      expect(updated).toMatchObject({
        developmentId: null,
        productionId: "990000000000000201",
        // With `developmentId` NULL the resolver falls back to production.
        resolvedId: "990000000000000201",
      });
      const after = await configRow("vip_role");
      expect(after.developmentId).toBeNull();
      expect(after.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
    });

    it("TC-020: never changes the row count or the key set", async () => {
      const rows = await client.select().from(discordConfig.DiscordConfig);

      // Compared against the code contract, not against itself: the keys are
      // read from code by name, so an update path that could insert or drop one
      // would be a silent break of that contract.
      expect(rows.map((row) => row.key).sort()).toEqual(
        [...DISCORD.CONFIG_KEYS].sort(),
      );
    });

    it("TC-024: audits only the columns that actually changed", async () => {
      const before = await configRow("admin_role");

      await console_.discordConfig.update({
        acknowledgeGuildRepoint: false,
        description: before.description,
        developmentId: before.developmentId ?? "",
        key: "admin_role",
        label: "Renamed admin role",
        productionId: before.productionId,
      });

      const [event] = await auditEventsFor("discord_config.updated").then(
        (events) => events.slice(-1),
      );
      expect(event?.changes).toEqual([
        { after: "Renamed admin role", before: before.label, field: "label" },
      ]);
      expect(event?.metadata).toMatchObject({
        configKey: "admin_role",
        configKind: "role",
        guildRepointAcknowledged: false,
        // Ten of the fourteen keys are read by nothing, and which ten is a fact
        // about a code version a later reader may not have.
        isInert: true,
      });
      const [subject] = await client
        .select({
          targetId: audit.AdminAuditSubject.targetId,
          targetLabel: audit.AdminAuditSubject.targetLabel,
          targetType: audit.AdminAuditSubject.targetType,
        })
        .from(audit.AdminAuditSubject)
        .where(eq(audit.AdminAuditSubject.eventId, event?.id ?? ABSENT_ID));
      expect(subject).toEqual({
        // The key, not the UUID — the key is what a reader can act on.
        targetId: "admin_role",
        targetLabel: before.label,
        targetType: "discord_config",
      });
    });

    it("TC-006: refuses a guild repoint without the acknowledgement and changes nothing", async () => {
      const before = await configRow("guild");

      await expect(
        console_.discordConfig.update({
          acknowledgeGuildRepoint: false,
          description: before.description,
          developmentId: "990000000000000301",
          key: "guild",
          label: before.label,
          productionId: before.productionId,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      expect(await configRow("guild")).toMatchObject({
        developmentId: before.developmentId,
      });
    });

    it("TC-006: allows a guild label edit without the acknowledgement", async () => {
      // The acknowledgement guards a *repoint*. A label edit changes nothing
      // any consumer resolves, so demanding it there would train officers to
      // click through the one dialog that matters.
      const before = await configRow("guild");

      const updated = await console_.discordConfig.update({
        acknowledgeGuildRepoint: false,
        description: before.description,
        developmentId: before.developmentId ?? "",
        key: "guild",
        label: "Knight Hacks server",
        productionId: before.productionId,
      });

      expect(updated.label).toBe("Knight Hacks server");
    });

    it("TC-009: the writing process sees its own write without waiting out the TTL", async () => {
      const before = await configRow("guild");
      // Warm the module-level snapshot so a stale read is possible at all.
      expect(await getKnightHacksGuildId()).toBe(before.developmentId);

      await console_.discordConfig.update({
        acknowledgeGuildRepoint: true,
        description: before.description,
        developmentId: "990000000000000401",
        key: "guild",
        label: before.label,
        productionId: before.productionId,
      });

      // No clock advance. The sixty-second TTL is not waited on.
      expect(await getKnightHacksGuildId()).toBe("990000000000000401");
    });

    it("TC-NEG-002: serialises two writers and audits the committed before", async () => {
      const key = "log_channel";
      const contended = "990000000000000501";
      const winner = "990000000000000502";
      let release = () => undefined as void;
      const held = new Promise<void>((resolve) => {
        release = () => resolve();
      });

      // A raw transaction, not a second mutation: the procedure's body is one
      // `db.transaction` call that returns only once it has committed, so there
      // is no seam to pause inside it. A held transaction can keep the lock for
      // exactly as long as the assertion needs.
      const holder = client.transaction(async (tx) => {
        await tx
          .select()
          .from(discordConfig.DiscordConfig)
          .where(eq(discordConfig.DiscordConfig.key, key))
          .for("update");
        await tx
          .update(discordConfig.DiscordConfig)
          .set({ productionId: contended })
          .where(eq(discordConfig.DiscordConfig.key, key));
        await held;
      });

      const before = await configRow(key);
      const contender = console_.discordConfig.update({
        acknowledgeGuildRepoint: false,
        description: before.description,
        developmentId: before.developmentId ?? "",
        key,
        label: before.label,
        productionId: winner,
      });
      const pending = Symbol("pending");
      expect(
        await Promise.race([
          contender,
          new Promise((resolve) => setTimeout(() => resolve(pending), 150)),
        ]),
      ).toBe(pending);

      release();
      await holder;
      await contender;

      expect((await configRow(key)).productionId).toBe(winner);
      const events = await auditEventsFor("discord_config.updated");
      // The assertion that matters: an implementation reading the row *before*
      // opening its transaction produces the same final value and a lying
      // audit trail, and only this tells the two apart.
      expect(events.at(-1)?.changes).toEqual([
        { after: winner, before: contended, field: "productionId" },
      ]);
    });

    it("TC-NEG-007: NOT_FOUND for a key with no row, and it creates none", async () => {
      const row = await configRow("volunteer_role");
      await client
        .delete(discordConfig.DiscordConfig)
        .where(eq(discordConfig.DiscordConfig.key, "volunteer_role"));

      try {
        await expect(
          console_.discordConfig.update({
            acknowledgeGuildRepoint: false,
            description: row.description,
            developmentId: "",
            key: "volunteer_role",
            label: row.label,
            productionId: row.productionId,
          }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
        expect(
          await client.select().from(discordConfig.DiscordConfig),
        ).toHaveLength(13);
      } finally {
        await client.insert(discordConfig.DiscordConfig).values(row);
      }
    });

    it("TC-NEG-001: the snowflake check constraints still reject direct SQL", async () => {
      await expect(
        disposable?.client.query(
          `UPDATE knight_hacks_discord_config SET production_id = '99000000000000000 ' WHERE key = 'vip_role'`,
        ),
      ).rejects.toThrow(/production_id_check/);
    });

    it("TC-NEG-011: an audit failure rolls the config write back", async () => {
      const before = await configRow("officer_role");
      auditControl.failWrites = true;

      try {
        await expect(
          console_.discordConfig.update({
            acknowledgeGuildRepoint: false,
            description: before.description,
            developmentId: before.developmentId ?? "",
            key: "officer_role",
            label: "Never committed",
            productionId: before.productionId,
          }),
        ).rejects.toThrow();
      } finally {
        auditControl.failWrites = false;
      }

      // No external side effect happened, so rolling the whole operation back
      // is the honest outcome.
      expect((await configRow("officer_role")).label).toBe(before.label);
    });
  });

  describe("clubTeams.updateClassification", () => {
    it("TC-010: a first classification reaches the public roster with no script run", async () => {
      const design = await teamIdBySlug("design");
      expect(occupiedSlugs(await getVisiblePublicClubRoster())).toEqual([]);

      const updated = await console_.clubTeams.updateClassification({
        calloutLabel: null,
        kind: "team",
        rank: 1,
        roleId: DESIGN_ROLE,
        rosterLabel: null,
        teamId: design,
      });

      expect(updated).toMatchObject({
        // A NULL override on a plain team member resolves to the team's label.
        resolvedCalloutLabel: "Design Team",
        resolvedRosterLabel: "Design",
      });
      // `loadClubTeamConfig` queries on every call, so there is no invalidation
      // seam to forget and no deploy to wait for.
      const roster = await getVisiblePublicClubRoster();
      expect(roster.members.design).toHaveLength(1);
      expect(await client.select().from(clubTeam.ClubTeamRole)).toHaveLength(1);
    });

    it("TC-024: audits a first classification as created, with no before", async () => {
      const [event] = await auditEventsFor("role.club_classification.updated");

      expect(event?.metadata).toEqual({ created: true });
      expect(event?.changes).toEqual([
        { after: "team", field: "kind" },
        { after: 1, field: "rank" },
        // The slug, not the UUID: a UUID in an audit row is unreadable.
        { after: "design", field: "teamSlug" },
        { after: null, field: "rosterLabel" },
        { after: null, field: "calloutLabel" },
      ]);
    });

    it("TC-012: moving a team role updates the row in place and audits the diff", async () => {
      const workshop = await teamIdBySlug("workshop");

      await console_.clubTeams.updateClassification({
        calloutLabel: null,
        kind: "team",
        rank: 1,
        roleId: DESIGN_ROLE,
        rosterLabel: null,
        teamId: workshop,
      });

      expect(await client.select().from(clubTeam.ClubTeamRole)).toHaveLength(1);
      const roster = await getVisiblePublicClubRoster();
      expect(roster.members.design).toEqual([]);
      expect(roster.members.workshop).toHaveLength(1);
      const events = await auditEventsFor("role.club_classification.updated");
      expect(events.at(-1)?.changes).toEqual([
        { after: "workshop", before: "design", field: "teamSlug" },
      ]);
      expect(events.at(-1)?.metadata).toEqual({ created: false });
    });

    it("TC-016: promoting a role out of team suppresses its holder's other memberships", async () => {
      const sponsorship = await teamIdBySlug("sponsorship");
      await console_.clubTeams.updateClassification({
        calloutLabel: null,
        kind: "team",
        rank: 1,
        roleId: MARKETING_ROLE,
        rosterLabel: null,
        teamId: sponsorship,
      });
      expect(occupiedSlugs(await getVisiblePublicClubRoster())).toEqual([
        "sponsorship",
        "workshop",
      ]);

      await console_.clubTeams.updateClassification({
        calloutLabel: null,
        kind: "director",
        rank: 2,
        roleId: MARKETING_ROLE,
        rosterLabel: null,
        teamId: sponsorship,
      });

      // The holder disappears from workshop as well, even though nothing about
      // the workshop classification changed. This is the case an officer files
      // as a bug: they edited one role and a different team lost a person.
      expect(occupiedSlugs(await getVisiblePublicClubRoster())).toEqual([
        "directors",
        "sponsorship",
      ]);
    });

    it("TC-NEG-007: NOT_FOUND for an unknown role and an unknown team", async () => {
      const design = await teamIdBySlug("design");

      await expect(
        console_.clubTeams.updateClassification({
          calloutLabel: null,
          kind: "team",
          rank: 1,
          roleId: ABSENT_ID,
          rosterLabel: null,
          teamId: design,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        console_.clubTeams.updateClassification({
          calloutLabel: null,
          kind: "team",
          rank: 1,
          roleId: DESIGN_ROLE,
          rosterLabel: null,
          teamId: ABSENT_ID,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(await client.select().from(clubTeam.ClubTeamRole)).toHaveLength(2);
    });

    it("TC-NEG-003: two concurrent first classifications leave exactly one row", async () => {
      const [design, workshop] = await Promise.all([
        teamIdBySlug("design"),
        teamIdBySlug("workshop"),
      ]);
      await client.insert(auth.Roles).values({
        discordRoleId: "990000000000000104",
        id: ABSENT_ID,
        name: "Race Role",
        permissions: "",
      });

      const results = await Promise.allSettled([
        console_.clubTeams.updateClassification({
          calloutLabel: null,
          kind: "team",
          rank: 1,
          roleId: ABSENT_ID,
          rosterLabel: null,
          teamId: design,
        }),
        console_.clubTeams.updateClassification({
          calloutLabel: null,
          kind: "team",
          rank: 2,
          roleId: ABSENT_ID,
          rosterLabel: null,
          teamId: workshop,
        }),
      ]);

      // The `roleId` unique constraint decides. The loser may update the
      // winner's row or conflict, but never inserts a second one and never
      // leaves the role classified twice.
      expect(results.some((result) => result.status === "fulfilled")).toBe(
        true,
      );
      const rows = await client
        .select()
        .from(clubTeam.ClubTeamRole)
        .where(eq(clubTeam.ClubTeamRole.roleId, ABSENT_ID));
      expect(rows).toHaveLength(1);
    });

    it("TC-NEG-005: the check constraint still rejects a team role with no team", async () => {
      await expect(
        disposable?.client.query(
          `INSERT INTO knight_hacks_club_team_role (role_id, kind, rank) VALUES ('${OFFICER_ROLE}', 'team', 1)`,
        ),
      ).rejects.toThrow(/team_check/);
    });

    it("TC-NEG-009: unlinking a classified role cascades its classification away", async () => {
      const remaining = await client.select().from(clubTeam.ClubTeamRole);
      await client
        .delete(auth.Permissions)
        .where(eq(auth.Permissions.roleId, ABSENT_ID));
      await client.delete(auth.Roles).where(eq(auth.Roles.id, ABSENT_ID));

      // No warning path exists: `getDependencyCounts` checks events, form
      // responses, form sections, issues and issue visibility — not
      // `ClubTeamRole`. Pinned so closing that gap later has a failing test to
      // start from.
      expect(await client.select().from(clubTeam.ClubTeamRole)).toHaveLength(
        remaining.length - 1,
      );
    });

    it("TC-020: the read never sees a team it did not seed", async () => {
      const configuration = await console_.clubTeams.listConfiguration();

      expect(configuration.teams).toHaveLength(8);
      expect(
        configuration.roles.filter((role) => role.classification === null),
      ).toHaveLength(1);
      expect(
        configuration.teams.find((team) => team.slug === "sponsorship")
          ?.classifiedRoleCount,
      ).toBe(1);
    });
  });
});
