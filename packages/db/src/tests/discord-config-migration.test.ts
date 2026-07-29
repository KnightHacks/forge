import { readdir, readFile } from "node:fs/promises";
import type { QueryResultRow } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DISCORD } from "@forge/consts";

import type { DisposableDatabase } from "../testing";
import { resolveDiscordConfigId } from "../schemas/discord-config";
import { canRunDatabaseTests, provisionDisposableDatabase } from "../testing";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

/**
 * The values `@forge/consts` held immediately before this migration, frozen.
 *
 * This is the load-bearing part of the suite. The backfill is the only thing
 * standing between "constants moved to a table" and "every Discord integration
 * quietly points somewhere else", and a wrong snowflake does not throw — it 404s
 * inside a cron job hours later, or worse, succeeds against the wrong channel.
 * Restating the numbers here means a typo in the migration fails the build
 * rather than production.
 *
 * `development` of `null` means the old constant had no DEV_ counterpart and
 * development reused the production value.
 */
const EXPECTED_BACKFILL: {
  development: string | null;
  key: DISCORD.ConfigKey;
  kind: DISCORD.ConfigKind;
  production: string;
}[] = [
  {
    development: "1151877367434850364",
    key: "guild",
    kind: "guild",
    production: "486628710443778071",
  },
  {
    development: "1284582557689843785",
    key: "log_channel",
    kind: "channel",
    production: "1324885515412963531",
  },
  {
    // RECRUITING_CHANNEL = IS_PROD ? PROD_RECRUITING_CHANNEL : DEV_LOG_CHANNEL.
    // The development value really was the log channel. Preserved, not fixed.
    development: "1284582557689843785",
    key: "recruiting_channel",
    kind: "channel",
    production: "1461758896950608104",
  },
  {
    development: "1246637685011906560",
    key: "officer_role",
    kind: "role",
    production: "486629374758748180",
  },
  {
    development: "1321955700540309645",
    key: "admin_role",
    kind: "role",
    production: "1319413082258411652",
  },
  {
    development: "1426947077514203279",
    key: "volunteer_role",
    kind: "role",
    production: "1415505872360312974",
  },
  {
    development: null,
    key: "alumni_role",
    kind: "role",
    production: "486629512101232661",
  },
  {
    development: "1423366084874080327",
    key: "vip_role",
    kind: "role",
    production: "1423358570203844689",
  },
  {
    development: null,
    key: "outreach_director_role",
    kind: "role",
    production: "779845137822908436",
  },
  {
    development: null,
    key: "design_director_role",
    kind: "role",
    production: "874028482089349172",
  },
  {
    development: null,
    key: "development_director_role",
    kind: "role",
    production: "1082124530077683772",
  },
  {
    development: null,
    key: "sponsorship_director_role",
    kind: "role",
    production: "626815399442513920",
  },
  {
    development: null,
    key: "workshops_director_role",
    kind: "role",
    production: "757002949603098837",
  },
  {
    development: null,
    key: "projects_mentorship_director_role",
    kind: "role",
    production: "1244790444626280550",
  },
];

interface DiscordConfigRow extends QueryResultRow {
  description: string;
  development_id: string | null;
  key: string;
  kind: string;
  label: string;
  production_id: string;
}

async function readDiscordConfigMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes(`CREATE TABLE "knight_hacks_discord_config"`)) {
      return { file, sql };
    }
  }
  throw new Error("Discord config migration was not found.");
}

describe("Discord config migration contract", () => {
  it("adds the table without touching anything that already exists", async () => {
    const { file, sql } = await readDiscordConfigMigration();

    expect(file.startsWith("0025_")).toBe(true);
    expect(sql).toContain(`CREATE TABLE "knight_hacks_discord_config"`);
    expect(sql).toContain(`knight_hacks_discord_config_kind_check`);
    expect(sql).toContain(`knight_hacks_discord_config_production_id_check`);
    expect(sql).toContain(`knight_hacks_discord_config_development_id_check`);
    expect(sql).toContain(`knight_hacks_discord_config_key_unique`);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER TABLE/);
  });

  it("backfills every setting and can be replayed without clobbering edits", async () => {
    const { sql } = await readDiscordConfigMigration();

    expect(sql).toContain(`INSERT INTO "knight_hacks_discord_config"`);
    expect(sql).toContain(`ON CONFLICT ("key") DO NOTHING`);
    for (const row of EXPECTED_BACKFILL) {
      expect(sql).toContain(`'${row.key}'`);
      expect(sql).toContain(`'${row.production}'`);
    }
  });

  it("covers exactly the keys the platform knows how to read", () => {
    expect([...EXPECTED_BACKFILL.map(({ key }) => key)].sort()).toEqual(
      [...DISCORD.CONFIG_KEYS].sort(),
    );
  });

  it("constrains kind to exactly the documented set", async () => {
    const { sql } = await readDiscordConfigMigration();
    const kinds = [...DISCORD.CONFIG_KINDS].sort();

    expect(sql).toContain(
      `CHECK ("knight_hacks_discord_config"."kind" IN (${kinds
        .map((kind) => `'${kind}'`)
        .join(", ")}))`,
    );
    expect(new Set(EXPECTED_BACKFILL.map(({ kind }) => kind))).toEqual(
      new Set(kinds),
    );
  });
});

describe("Discord config environment resolution", () => {
  it("prefers the environment's own ID and falls back to production", () => {
    expect(
      resolveDiscordConfigId(
        { developmentId: "222", productionId: "111" },
        true,
      ),
    ).toBe("111");
    expect(
      resolveDiscordConfigId(
        { developmentId: "222", productionId: "111" },
        false,
      ),
    ).toBe("222");
    expect(
      resolveDiscordConfigId(
        { developmentId: null, productionId: "111" },
        false,
      ),
    ).toBe("111");
  });
});

describe.runIf(canRunDatabaseTests())(
  "Discord config backfill against a real database",
  () => {
    let database: DisposableDatabase;

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_discord_config");
    }, 120_000);

    afterAll(async () => {
      await database.drop();
    });

    it("lands exactly the pre-migration constant values", async () => {
      const { rows } = await database.client.query<DiscordConfigRow>(
        `SELECT "key", "kind", "label", "description", "production_id", "development_id"
         FROM "knight_hacks_discord_config" ORDER BY "key"`,
      );

      expect(rows).toHaveLength(EXPECTED_BACKFILL.length);
      for (const expected of EXPECTED_BACKFILL) {
        const row = rows.find(({ key }) => key === expected.key);
        expect(
          row,
          `missing backfilled row for "${expected.key}"`,
        ).toBeDefined();
        expect({
          development_id: row?.development_id,
          kind: row?.kind,
          production_id: row?.production_id,
        }).toEqual({
          development_id: expected.development,
          kind: expected.kind,
          production_id: expected.production,
        });
        // A row an officer cannot interpret is a row an officer will guess at.
        expect(row?.label.length).toBeGreaterThan(0);
        expect(row?.description.length).toBeGreaterThan(0);
      }
    });

    it("resolves to the same ID the deleted constant produced, per environment", async () => {
      const { rows } = await database.client.query<DiscordConfigRow>(
        `SELECT "key", "production_id", "development_id"
         FROM "knight_hacks_discord_config"`,
      );
      const byKey = new Map(rows.map((row) => [row.key, row]));

      for (const expected of EXPECTED_BACKFILL) {
        const row = byKey.get(expected.key);
        const resolved = {
          developmentId: row?.development_id ?? null,
          productionId: row?.production_id ?? "",
        };
        expect(resolveDiscordConfigId(resolved, true)).toBe(
          expected.production,
        );
        expect(resolveDiscordConfigId(resolved, false)).toBe(
          expected.development ?? expected.production,
        );
      }
    });

    it("rejects a value that is not a Discord snowflake", async () => {
      // A trailing space survives a copy-paste out of Discord and is invisible
      // in a text input, which makes it the most likely way an officer breaks
      // this table once a UI exists.
      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_discord_config"
             ("key", "kind", "label", "description", "production_id")
           VALUES ('guild_bad', 'guild', 'Bad', 'Bad', '486628710443778071 ')`,
        ),
      ).rejects.toThrow(/production_id_check/);

      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_discord_config"
             ("key", "kind", "label", "description", "production_id", "development_id")
           VALUES ('guild_bad', 'guild', 'Bad', 'Bad', '486628710443778071', '12345')`,
        ),
      ).rejects.toThrow(/development_id_check/);
    });

    it("rejects a kind outside the documented set", async () => {
      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_discord_config"
             ("key", "kind", "label", "description", "production_id")
           VALUES ('guild_bad', 'category', 'Bad', 'Bad', '486628710443778071')`,
        ),
      ).rejects.toThrow(/kind_check/);
    });

    it("rejects a duplicate key so a setting cannot have two answers", async () => {
      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_discord_config"
             ("key", "kind", "label", "description", "production_id")
           VALUES ('guild', 'guild', 'Duplicate', 'Duplicate', '486628710443778071')`,
        ),
      ).rejects.toThrow(/knight_hacks_discord_config_key_unique/);
    });
  },
);
