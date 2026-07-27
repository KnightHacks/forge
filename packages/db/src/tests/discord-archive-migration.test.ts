import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

async function readDiscordArchiveMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes(`CREATE TABLE "discord_archive_message"`)) {
      return { file, sql };
    }
  }
  throw new Error("Discord archive migration was not found.");
}

describe("Discord archive migration contract", () => {
  it("TC-043 lands after the email migrations as an additive migration", async () => {
    const { file, sql } = await readDiscordArchiveMigration();

    expect(file.startsWith("0024_")).toBe(true);
    expect(sql).toContain(`CREATE TABLE "discord_archive_channel"`);
    expect(sql).toContain(`CREATE TABLE "discord_archive_message"`);
    expect(sql).toContain(`CREATE TABLE "discord_archive_checkpoint"`);
    expect(sql).toContain(`CREATE TABLE "discord_archive_state"`);
    expect(sql).not.toMatch(/INSERT INTO "discord_archive_/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("TC-043 creates cursor, aggregate, and state constraints", async () => {
    const { sql } = await readDiscordArchiveMigration();

    expect(sql).toContain(`discord_archive_message_channel_created_idx`);
    expect(sql).toContain(`discord_archive_message_guild_created_idx`);
    expect(sql).toContain(`discord_archive_message_author_created_idx`);
    expect(sql).toContain(`"last_backfill_at" timestamp with time zone`);
    expect(sql).toContain(`discord_archive_checkpoint_status_check`);
    expect(sql).toContain(`discord_archive_state_status_check`);
    expect(sql).toContain(
      `FOREIGN KEY ("channel_id") REFERENCES "public"."discord_archive_channel"`,
    );
  });
});
