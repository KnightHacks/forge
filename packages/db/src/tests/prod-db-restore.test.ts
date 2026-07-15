import { describe, expect, it } from "vitest";

import {
  psqlFileArgs,
  truncateRestorePostlude,
  truncateRestorePrelude,
} from "../../scripts/prod-db-restore";

describe("production database restore safety", () => {
  const connection = {
    database: "local",
    host: "localhost",
    port: "5432",
    user: "postgres",
  };

  it("runs every SQL file fail-fast in one transaction", () => {
    expect(
      psqlFileArgs(connection, ["pre.sql", "backup.sql", "post.sql"], {
        singleTransaction: true,
      }),
    ).toEqual([
      "-v",
      "ON_ERROR_STOP=1",
      "--single-transaction",
      "-h",
      "localhost",
      "-p",
      "5432",
      "-U",
      "postgres",
      "-d",
      "local",
      "-f",
      "pre.sql",
      "-f",
      "backup.sql",
      "-f",
      "post.sql",
    ]);
  });

  it("preserves the local ledger and validates event restore invariants", () => {
    expect(truncateRestorePrelude()).toMatch(/drizzle_migrations/);
    expect(truncateRestorePrelude()).toMatch(/TRUNCATE TABLE %I\.%I CASCADE/);
    expect(truncateRestorePostlude()).toMatch(/points_awarded_estimated/);
    expect(truncateRestorePostlude()).toMatch(/orphan event attendance/i);
    expect(truncateRestorePostlude()).toMatch(/event tag catalog empty/i);
    expect(truncateRestorePostlude()).toMatch(/migration ledger/i);
  });
});
