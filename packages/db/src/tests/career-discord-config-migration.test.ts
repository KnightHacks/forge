import type { QueryResultRow } from "pg";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DISCORD } from "@forge/consts";

import type { DisposableDatabase } from "../testing";
import {
  DiscordConfig,
  resolveDiscordConfigId,
} from "../schemas/discord-config";
import {
  applyMigration,
  canRunDatabaseTests,
  provisionDisposableDatabase,
  readMigrations,
} from "../testing";
import { EXPECTED_CAREER_CONFIG } from "./support/career-discord-config";

interface ConfigRow extends QueryResultRow {
  description: string;
  development_id: string | null;
  key: string;
  kind: string;
  label: string;
  production_id: string | null;
}

/** Loads the Career migration and its seed statement for replay tests. */
async function careerMigration() {
  const migration = (await readMigrations()).find(({ name }) =>
    name.startsWith("0064_career_discord_config"),
  );
  if (!migration) throw new Error("Career config migration is missing.");
  // Replays re-run only the seed; the schema statements are not repeatable.
  const seed = migration.sql
    .split("--> statement-breakpoint")
    .find((statement) => statement.includes("INSERT INTO"));
  if (!seed) throw new Error("Career config seed statement is missing.");
  return { migration, seed: { name: migration.name, sql: seed } };
}

describe("Career Discord configuration storage contract", () => {
  it("allows an absent production value with a key-specific presence constraint", () => {
    expect(DiscordConfig.productionId.notNull).toBe(false);
    expect(
      getTableConfig(DiscordConfig).checks.map(({ name }) => name),
    ).toContain("knight_hacks_discord_config_production_id_required_check");
  });

  it("registers an additive schema migration and a non-destructive seed", async () => {
    const { migration, seed } = await careerMigration();
    expect(migration.sql).toContain(
      'ALTER COLUMN "production_id" DROP NOT NULL',
    );
    expect(migration.sql).toContain("career_source_health_channel");
    expect(migration.sql).not.toMatch(/DROP (TABLE|COLUMN)/);
    expect(migration.sql).not.toMatch(/\b(UPDATE|DELETE|TRUNCATE)\b/i);
    expect(seed.sql).toContain('ON CONFLICT ("key") DO NOTHING');
    for (const row of EXPECTED_CAREER_CONFIG) {
      expect(seed.sql).toContain(`'${row.key}'`);
      if (row.production !== null)
        expect(seed.sql).toContain(`'${row.production}'`);
    }
  });

  it("resolves an unconfigured destination to null, with an independent development override", () => {
    const unset = { developmentId: null, productionId: null };
    expect(resolveDiscordConfigId(unset, true)).toBeNull();
    expect(resolveDiscordConfigId(unset, false)).toBeNull();
    const developmentOnly = { ...unset, developmentId: "222222222222222222" };
    expect(resolveDiscordConfigId(developmentOnly, true)).toBeNull();
    expect(resolveDiscordConfigId(developmentOnly, false)).toBe(
      "222222222222222222",
    );
  });
});

describe.runIf(canRunDatabaseTests())(
  "Career Discord config migrations on PostgreSQL",
  () => {
    let database: DisposableDatabase;

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_career_config");
    }, 120_000);

    afterAll(async () => {
      await database.drop();
    });

    /** Reads all Discord config rows, ordered by key. */
    async function rows() {
      return (
        await database.client.query<ConfigRow>(
          'SELECT * FROM "knight_hacks_discord_config" ORDER BY "key"',
        )
      ).rows;
    }

    it("TC-648-001: seeds all five rows with the supplied IDs and only failure alerts unset", async () => {
      const saved = await rows();
      expect(saved.map(({ key }) => key).sort()).toEqual(
        [...DISCORD.CONFIG_KEYS].sort(),
      );
      for (const expected of EXPECTED_CAREER_CONFIG) {
        const row = saved.find(({ key }) => key === expected.key);
        expect(row).toMatchObject({
          description: expected.description,
          development_id: expected.development,
          key: expected.key,
          kind: expected.kind,
          production_id: expected.production,
        });
        expect(row?.label.trim().length).toBeGreaterThan(0);
        expect(row?.description.trim().length).toBeGreaterThan(0);
      }
      expect(
        saved
          .filter(({ production_id }) => production_id === null)
          .map(({ key }) => key),
      ).toEqual(["career_source_health_channel"]);
    });

    it("TC-648-002: upgrades the previous schema without changing existing officer edits", async () => {
      const { migration } = await careerMigration();
      await database.client.query("BEGIN");
      try {
        await database.client.query(
          "DELETE FROM knight_hacks_discord_config WHERE key LIKE 'career_%'",
        );
        await database.client.query(
          "ALTER TABLE knight_hacks_discord_config DROP CONSTRAINT knight_hacks_discord_config_production_id_required_check",
        );
        await database.client.query(
          "ALTER TABLE knight_hacks_discord_config ALTER COLUMN production_id SET NOT NULL",
        );
        await database.client.query(
          "UPDATE knight_hacks_discord_config SET production_id = '999999999999999999' WHERE key = 'log_channel'",
        );
        const before = await rows();
        await applyMigration(database.client, migration);
        const after = await rows();
        expect(after.filter(({ key }) => !key.startsWith("career_"))).toEqual(
          before,
        );
        expect(after).toHaveLength(DISCORD.CONFIG_KEYS.length);
      } finally {
        await database.client.query("ROLLBACK");
      }
    });

    it("TC-648-002: seed replay preserves edited and cleared values and inserts missing rows", async () => {
      const { seed } = await careerMigration();
      await database.client.query("BEGIN");
      try {
        await database.client.query(
          "UPDATE knight_hacks_discord_config SET label = 'Officer choice', description = 'Officer custom description', production_id = '999999999999999999', development_id = '888888888888888888' WHERE key = 'career_internship_channel'",
        );
        await database.client.query(
          "DELETE FROM knight_hacks_discord_config WHERE key = 'career_new_grad_digest_role'",
        );
        await applyMigration(database.client, seed);
        const once = await rows();
        await applyMigration(database.client, seed);
        expect(await rows()).toEqual(once);
        expect(once).toHaveLength(DISCORD.CONFIG_KEYS.length);
        expect(
          once.find(({ key }) => key === "career_internship_channel"),
        ).toMatchObject({
          label: "Officer choice",
          description: "Officer custom description",
          production_id: "999999999999999999",
          development_id: "888888888888888888",
        });
        expect(
          once.find(({ key }) => key === "career_source_health_channel")
            ?.production_id,
        ).toBeNull();
      } finally {
        await database.client.query("ROLLBACK");
      }
    });

    it("requires production IDs for every other key, including after renaming the optional row", async () => {
      for (const key of DISCORD.CONFIG_KEYS.filter(
        (key) => key !== "career_source_health_channel",
      )) {
        await expect(
          database.client.query(
            "UPDATE knight_hacks_discord_config SET production_id = NULL WHERE key = $1",
            [key],
          ),
        ).rejects.toThrow(/production_id_required_check/);
      }
      await expect(
        database.client.query(
          "UPDATE knight_hacks_discord_config SET key = 'unexpected_optional' WHERE key = 'career_source_health_channel'",
        ),
      ).rejects.toThrow(/production_id_required_check/);
    });

    it("lets officers configure and clear failure alerts while retaining snowflake checks", async () => {
      for (const column of ["production_id", "development_id"]) {
        for (const value of [
          "",
          "123",
          "12345678901234567 ",
          "<@&1537949002031562862>",
        ]) {
          await expect(
            database.client.query(
              `UPDATE knight_hacks_discord_config SET ${column} = $1 WHERE key = 'career_source_health_channel'`,
              [value],
            ),
          ).rejects.toThrow(new RegExp(`${column}_check|value too long`));
        }
      }
      await database.client.query(
        "UPDATE knight_hacks_discord_config SET production_id = '999999999999999999' WHERE key = 'career_source_health_channel'",
      );
      expect(
        (await rows()).find(({ key }) => key === "career_source_health_channel")
          ?.production_id,
      ).toBe("999999999999999999");
      await database.client.query(
        "UPDATE knight_hacks_discord_config SET production_id = NULL WHERE key = 'career_source_health_channel'",
      );
      expect(
        (await rows()).find(({ key }) => key === "career_source_health_channel")
          ?.production_id,
      ).toBeNull();
    });
  },
);
