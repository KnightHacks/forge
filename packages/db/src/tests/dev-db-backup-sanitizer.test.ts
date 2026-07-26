import { describe, expect, it } from "vitest";

import { TEAM } from "@forge/consts";

import {
  MEMBERS_OF_THE_TEAM_ROLE_NAMES,
  sanitizedEventProviderState,
  TABLES_TO_KEEP,
  teamDataSanitizerSql,
} from "../../scripts/dev-db-backup-sanitizer";

describe("development database backup sanitizer", () => {
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

  it("defines members of the team through the canonical club roster roles", () => {
    const sanitizer = teamDataSanitizerSql();

    expect(MEMBERS_OF_THE_TEAM_ROLE_NAMES).toEqual(TEAM.CLUB_ROSTER_ROLE_NAMES);
    expect(sanitizer).toMatch(/WHERE role\.name IN/);
    expect(sanitizer).not.toContain("email_audience_enabled");
    for (const roleName of TEAM.CLUB_ROSTER_ROLE_NAMES) {
      expect(sanitizer).toContain(`'${roleName}'`);
    }
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
