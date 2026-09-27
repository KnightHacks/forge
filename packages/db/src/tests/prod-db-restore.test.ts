import { describe, expect, it } from "vitest";

import {
  isRetiredJudgingDumpStatement,
  psqlFileArgs,
  RetiredJudgingDumpFilter,
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
    expect(truncateRestorePostlude()).toMatch(
      /saved\."hackathon_id" IS NULL OR EXISTS/,
    );
    expect(truncateRestorePostlude()).toMatch(
      /knight_hacks_hackathon" AS hackathon/,
    );
  });

  it("omits data and trigger statements for retired judging tables", () => {
    expect(
      isRetiredJudgingDumpStatement(
        "INSERT INTO public.knight_hacks_teams (id) VALUES ('legacy');",
      ),
    ).toBe(true);
    expect(
      isRetiredJudgingDumpStatement(
        "ALTER TABLE public.auth_judge_session DISABLE TRIGGER ALL;",
      ),
    ).toBe(true);
    expect(
      isRetiredJudgingDumpStatement(
        "INSERT INTO public.knight_hacks_project (id) VALUES ('current');",
      ),
    ).toBe(false);
    expect(
      isRetiredJudgingDumpStatement(
        "INSERT INTO public.auth_user (name) VALUES ('knight_hacks_teams');",
      ),
    ).toBe(false);
  });

  it("omits every line of a retired-table statement", () => {
    const filter = new RetiredJudgingDumpFilter();
    const lines = [
      "INSERT INTO public.knight_hacks_teams (notes) VALUES ('first line",
      "INSERT INTO public.auth_user (name) VALUES (''text inside the value'');",
      "last line');",
      "INSERT INTO public.auth_user (name) VALUES ('kept');",
    ];

    expect(lines.filter((line) => filter.shouldInclude(line))).toEqual([
      "INSERT INTO public.auth_user (name) VALUES ('kept');",
    ]);
  });

  it("omits multiline retired-table escape strings through their terminator", () => {
    const filter = new RetiredJudgingDumpFilter();
    const lines = [
      "INSERT INTO public.knight_hacks_teams (notes) VALUES (E'first line",
      "escaped quote \\' stays inside the value;",
      "last line');",
      "INSERT INTO public.auth_user (name) VALUES ('kept');",
    ];

    expect(lines.filter((line) => filter.shouldInclude(line))).toEqual([
      "INSERT INTO public.auth_user (name) VALUES ('kept');",
    ]);
  });

  it("keeps retired-table text inside a current-table value", () => {
    const filter = new RetiredJudgingDumpFilter();
    const lines = [
      "INSERT INTO public.auth_user (name) VALUES ('first line",
      "INSERT INTO public.knight_hacks_teams (id) VALUES (''not SQL'');",
      "last line');",
    ];

    expect(lines.filter((line) => filter.shouldInclude(line))).toEqual(lines);
  });
});
