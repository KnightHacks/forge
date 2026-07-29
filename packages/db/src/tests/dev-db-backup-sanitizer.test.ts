import { getTableName, is, Table } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  sanitizedEventProviderState,
  TABLES_TO_DROP,
  TABLES_TO_KEEP,
  teamDataSanitizerSql,
} from "../../scripts/dev-db-backup-sanitizer";
import * as auditSchema from "../schemas/audit";
import * as authSchema from "../schemas/auth";
import * as clubTeamSchema from "../schemas/club-team";
import * as discordSchema from "../schemas/discord";
import * as discordConfigSchema from "../schemas/discord-config";
import * as knightHacksSchema from "../schemas/knight-hacks";

/**
 * Every table Drizzle knows about, read out of the schema modules rather than
 * listed by hand — a list written by hand is the thing that failed here.
 */
function schemaTableNames() {
  const modules = [
    auditSchema,
    authSchema,
    clubTeamSchema,
    discordSchema,
    discordConfigSchema,
    knightHacksSchema,
  ];

  return [
    ...new Set(
      modules
        // `unknown[]`, not the inferred `any[]`: these modules export types
        // alongside tables, so the values are only narrowed by the `is` guard
        // on the next line and must not be trusted before it.
        .flatMap((module): unknown[] => Object.values(module))
        .filter((value): value is Table => is(value, Table))
        .map((table) => getTableName(table)),
    ),
  ].sort();
}

describe("development database backup sanitizer", () => {
  // The gate. The two `arrayContaining` assertions below sample the list; this
  // one covers it, so a table added next year cannot default to being dropped
  // just because nobody remembered this file existed.
  it("classifies every table in the schema as kept or dropped", () => {
    const classified = [...TABLES_TO_KEEP, ...TABLES_TO_DROP].sort();

    expect(classified).toEqual(schemaTableNames());
  });

  it("never both keeps and drops the same table", () => {
    const kept = new Set<string>(TABLES_TO_KEEP);

    expect(TABLES_TO_DROP.filter((table) => kept.has(table))).toEqual([]);
  });

  // The bug the gate above was written for: configuration that an officer set
  // in Blade, truncated out of every dev backup since `becc28d1`. Migrations
  // cannot restore it — the backfill has already been recorded as applied — so
  // a developer restoring a backup gets a Blade with no Discord configuration
  // and no indication that it ever had one.
  it("keeps officer-managed configuration, including the Discord config", () => {
    expect(TABLES_TO_KEEP).toEqual(
      expect.arrayContaining([
        "knight_hacks_club_team",
        "knight_hacks_club_team_role",
        "knight_hacks_discord_config",
      ]),
    );
  });

  it("keeps the approved Reforge configuration and team-owned tables", () => {
    expect(TABLES_TO_KEEP).toEqual(
      expect.arrayContaining([
        "auth_account",
        "email_template",
        "email_template_revision",
        "knight_hacks_alumni_bulletin_post",
        "knight_hacks_company",
        "knight_hacks_employment",
        "knight_hacks_event_feedback",
        "knight_hacks_event_feedback_config",
        "knight_hacks_event_feedback_reward",
        "knight_hacks_event_tag",
        "knight_hacks_form_callback_configuration",
        "knight_hacks_form_section_edit_role",
        "knight_hacks_form_section_view_role",
        "knight_hacks_form_single_response_claim",
      ]),
    );
  });

  it("does not retain protected content, work queues, or recipient snapshots", () => {
    expect(TABLES_TO_KEEP).not.toEqual(
      expect.arrayContaining([
        "audit_event",
        "audit_subject",
        "discord_archive_channel",
        "discord_archive_checkpoint",
        "discord_archive_message",
        "discord_archive_state",
        "email_send",
        "email_send_event",
        "email_send_recipient",
        "knight_hacks_form_attachment",
        "knight_hacks_form_callback_execution",
        "knight_hacks_issue",
        "knight_hacks_issue_history",
        "knight_hacks_issue_reminder_delivery",
      ]),
    );
  });

  it("defines members of the team by club roster classification, not by role name", () => {
    const sanitizer = teamDataSanitizerSql();

    expect(sanitizer).toContain(
      "INNER JOIN knight_hacks_club_team_role AS club_role",
    );
    expect(sanitizer).toContain("club_role.role_id = permission.role_id");
    // A renamed Discord role used to shrink the set of people a development
    // backup kept, silently, because the names were interpolated from a
    // constant.
    expect(sanitizer).not.toMatch(/role\.name IN/);
    expect(sanitizer).not.toContain("email_audience_enabled");
  });

  it("keeps the club roster configuration tables in the development backup", () => {
    expect(TABLES_TO_KEEP).toEqual(
      expect.arrayContaining([
        "knight_hacks_club_team",
        "knight_hacks_club_team_role",
      ]),
    );
  });

  it("removes non-team users and production credentials", () => {
    const sanitizer = teamDataSanitizerSql();

    expect(sanitizer).toMatch(/DELETE FROM auth_user/);
    expect(sanitizer).toMatch(/UPDATE auth_account/);
    expect(sanitizer).toMatch(/refresh_token = NULL/);
    expect(sanitizer).toMatch(/access_token = NULL/);
    expect(sanitizer).toMatch(/id_token = NULL/);
    expect(sanitizer).toMatch(/stripe_payment_intent_id = NULL/);
  });

  it("keeps a mapped dev Discord event but resets production provider state", () => {
    expect(
      sanitizedEventProviderState(false, "dev-discord-event"),
    ).toMatchObject({
      deletionIntentAt: null,
      discordAppliedRevision: null,
      discordChannelId: null,
      discordId: "dev-discord-event",
      discordSyncState: "pending",
      googleAppliedCalendarId: null,
      googleId: null,
      googleSyncState: "pending",
      syncLeaseToken: null,
    });
  });

  it("leaves legacy events inert when no dev Discord event exists", () => {
    expect(sanitizedEventProviderState(true)).toMatchObject({
      discordId: null,
      discordSyncState: null,
      googleId: null,
      googleSyncState: null,
    });
  });
});
