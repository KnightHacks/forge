/**
 * Tables whose rows survive into a development backup.
 *
 * Every table in the Drizzle schema must appear either here or in
 * `TABLES_TO_DROP`, and `dev-db-backup-sanitizer.test.ts` fails if one appears
 * in neither. That gate exists because this list was previously checked only
 * against a hand-written sample of table names, so a table added later was
 * silently truncated: `knight_hacks_discord_config` shipped empty in every dev
 * backup from `becc28d1` onward, and re-running migrations could not repair it
 * because its backfill migration had already been recorded as applied.
 */
export const TABLES_TO_KEEP = [
  "auth_account",
  "auth_permissions",
  "auth_roles",
  "auth_user",
  "email_template",
  "email_template_revision",
  "knight_hacks_alumni_bulletin_post",
  "knight_hacks_challenges",
  "knight_hacks_club_team",
  "knight_hacks_club_team_role",
  "knight_hacks_companies",
  "knight_hacks_company",
  "knight_hacks_discord_config",
  "knight_hacks_dues_configuration",
  "knight_hacks_dues_payment",
  "knight_hacks_employment",
  "knight_hacks_event",
  "knight_hacks_event_attendee",
  "knight_hacks_event_feedback",
  "knight_hacks_event_feedback_config",
  "knight_hacks_event_feedback_reward",
  "knight_hacks_event_tag",
  "knight_hacks_form_callback_configuration",
  "knight_hacks_form_response",
  "knight_hacks_form_response_roles",
  "knight_hacks_form_schemas",
  "knight_hacks_form_section_edit_role",
  "knight_hacks_form_section_roles",
  "knight_hacks_form_section_view_role",
  "knight_hacks_form_sections",
  "knight_hacks_form_single_response_claim",
  "knight_hacks_hackathon",
  "knight_hacks_hackathon_agreement_definition",
  // Configuration, not personal data: which Discord role and colour each class
  // maps to, and which template and subject each status sends. Publication
  // rows keep their stable identity but are explicitly reset off below so a
  // restored development database cannot write to external calendars by
  // surprise. Losing the rest means an officer's whole hackathon setup comes
  // back empty — the same failure `knight_hacks_discord_config` had.
  "knight_hacks_hackathon_class",
  "knight_hacks_hackathon_event_publication",
  "knight_hacks_hackathon_portal_client",
  "knight_hacks_hackathon_sponsor",
  "knight_hacks_hackathon_status_email",
  "knight_hacks_hacker",
  "knight_hacks_hacker_agreement_acceptance",
  "knight_hacks_hacker_attendee",
  "knight_hacks_hacker_event_attendee",
  "knight_hacks_hacker_profile",
  "knight_hacks_hacker_profile_revision",
  "knight_hacks_member",
  "knight_hacks_sponsor",
  "knight_hacks_submissions",
  "knight_hacks_teams",
  // Officer-authored issue-tree configuration. This is unrelated to the email
  // template catalog despite the older table's generic name.
  "knight_hacks_template",
  "knight_hacks_trpc_form_connection",
] as const;

/**
 * Tables deliberately emptied, grouped by the reason they are emptied.
 *
 * The runtime truncates only these names and refuses any actual public table
 * that appears in neither list. That makes adding a table require a decision
 * instead of defaulting to silent truncation, and keeps the reason next to the
 * name rather than inferring it later from absence.
 */
export const TABLES_TO_DROP = [
  // Records of who did what, tied to real people. Not developer data.
  "audit_event",
  "audit_subject",
  // Live credentials. A backup that carries these hands out logins.
  "auth_judge_session",
  "auth_session",
  "auth_verification",
  // Members' private Discord conversations.
  "discord_archive_channel",
  "discord_archive_checkpoint",
  "discord_archive_message",
  "discord_archive_state",
  // Delivery logs holding recipient snapshots — every address a send touched.
  "email_send",
  "email_send_event",
  "email_send_recipient",
  // Uploaded objects are not copied with this data-only export. Response files
  // are private, and retained form definitions have object-backed instruction
  // references removed below so they do not point at missing MinIO content.
  "knight_hacks_form_attachment",
  "knight_hacks_form_callback_execution",
  // Live check-in identity/result history and Discord delivery state. These are
  // tied to real applicants and are operational queues, not developer fixtures.
  "knight_hacks_hackathon_event_reminder_delivery",
  "knight_hacks_hackathon_portal_authorization_code",
  "knight_hacks_hackathon_portal_session",
  "knight_hacks_hackathon_portal_session_credential",
  "knight_hacks_hacker_check_in_attempt",
  "knight_hacks_hacker_check_in_pass",
  "knight_hacks_hacker_discord_role_grant",
  "knight_hacks_hacker_discord_role_grant_attempt",
  "knight_hacks_hacker_participant_command",
  "knight_hacks_event_publication_work",
  // Work queues. Real assignments and reminders aimed at real officers.
  "knight_hacks_issue",
  "knight_hacks_issue_history",
  "knight_hacks_issue_reminder_delivery",
  "knight_hacks_issues_to_teams_visibility",
  "knight_hacks_issues_to_users_assignment",
  // Judging data: scores attached to named people.
  "knight_hacks_judged_submission",
  "knight_hacks_judges",
] as const;

/** Actual database tables that have no explicit development-backup policy. */
export function unclassifiedDatabaseTables(actualNames: readonly string[]) {
  const classified = new Set<string>([...TABLES_TO_KEEP, ...TABLES_TO_DROP]);

  return [...new Set(actualNames)]
    .filter((name) => !classified.has(name))
    .sort();
}

/**
 * Removes non-team people after non-retained tables have been truncated.
 *
 * "Members of the team" are users holding a role the club roster classifies —
 * an officer, a director, or a team role. All of that user's remaining roles
 * and product data are kept.
 *
 * That membership used to be a list of role names interpolated into this SQL
 * from `@forge/consts`. It is a join on `knight_hacks_club_team_role` now, so a
 * renamed Discord role cannot quietly shrink the set of people a development
 * backup keeps.
 */
export function teamDataSanitizerSql() {
  return `
CREATE TEMP TABLE "forge_team_user" AS
SELECT DISTINCT permission.user_id
FROM auth_permissions AS permission
INNER JOIN knight_hacks_club_team_role AS club_role
  ON club_role.role_id = permission.role_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM forge_team_user) THEN
    RAISE EXCEPTION 'Refusing to create a dev backup without any team users.';
  END IF;
END $$;

DELETE FROM knight_hacks_event_feedback_reward AS reward
WHERE NOT EXISTS (
  SELECT 1
  FROM knight_hacks_member AS member
  INNER JOIN forge_team_user AS team ON team.user_id = member.user_id
  WHERE member.id = reward.member_id
);

DELETE FROM email_template_revision AS revision
WHERE NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = revision.created_by
)
OR NOT EXISTS (
  SELECT 1
  FROM email_template AS template
  INNER JOIN forge_team_user AS creator
    ON creator.user_id = template.created_by
  INNER JOIN forge_team_user AS updater
    ON updater.user_id = template.updated_by
  WHERE template.id = revision.template_id
);

DELETE FROM email_template AS template
WHERE NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = template.created_by
)
OR NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = template.updated_by
);

DELETE FROM knight_hacks_alumni_bulletin_post AS post
WHERE NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = post.created_by_user_id
)
OR NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = post.updated_by_user_id
);

DELETE FROM auth_permissions AS permission
WHERE NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = permission.user_id
);

UPDATE auth_account
SET refresh_token = NULL,
    access_token = NULL,
    expires_at = NULL,
    id_token = NULL;

UPDATE knight_hacks_dues_payment
SET stripe_payment_intent_id = NULL;

UPDATE knight_hacks_dues_configuration
SET payments_enabled = FALSE;

UPDATE knight_hacks_company
SET logo_object_name = NULL;

UPDATE knight_hacks_alumni_bulletin_post
SET image_object_name = NULL,
    image_alt = NULL;

UPDATE knight_hacks_teams
SET emails = NULL,
    notes = NULL,
    match_key = NULL;

DELETE FROM auth_user AS app_user
WHERE NOT EXISTS (
  SELECT 1 FROM forge_team_user AS team
  WHERE team.user_id = app_user.id
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth_account
    WHERE refresh_token IS NOT NULL
       OR access_token IS NOT NULL
       OR id_token IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'OAuth credentials survived dev backup sanitization.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth_user AS app_user
    WHERE NOT EXISTS (
      SELECT 1 FROM forge_team_user AS team
      WHERE team.user_id = app_user.id
    )
  ) THEN
    RAISE EXCEPTION 'A non-team user survived dev backup sanitization.';
  END IF;
END $$;

DROP TABLE forge_team_user;
`;
}

export function sanitizedEventProviderState(
  legacy: boolean,
  mappedDiscordId?: string,
) {
  const syncState = legacy ? null : ("pending" as const);

  return {
    deletionIntentAt: null,
    discordAppliedChannelId: null,
    discordAppliedEntityType: null,
    discordAppliedRevision: null,
    discordChannelId: null,
    discordId: mappedDiscordId ?? null,
    discordLastError: null,
    discordNoProjectionAcknowledgedAt: null,
    discordNoProjectionAcknowledgedBy: null,
    discordOutboundAttemptRevision: null,
    discordOutboundAttemptToken: null,
    discordOutboundAttemptedAt: null,
    discordSyncState: syncState,
    googleAppliedCalendarId: null,
    googleAppliedDestination: null,
    googleAppliedRevision: null,
    googleId: null,
    googleLastError: null,
    googleOutboundAttemptRevision: null,
    googleOutboundAttemptToken: null,
    googleOutboundAttemptedAt: null,
    googleSyncState: syncState,
    syncLeaseExpiresAt: null,
    syncLeaseRevision: null,
    syncLeaseToken: null,
  };
}

/**
 * Makes a retained Hackathon event inert until development explicitly enables
 * publication. Unlike the legacy mapper above, no production provider identity
 * survives this reset.
 */
export function sanitizedHackathonEventProviderState() {
  return {
    deletionIntentAt: null,
    discordAppliedChannelId: null,
    discordAppliedEntityType: null,
    discordAppliedRevision: null,
    discordChannelId: null,
    discordId: null,
    discordLastError: null,
    discordNoProjectionAcknowledgedAt: null,
    discordNoProjectionAcknowledgedBy: null,
    discordOutboundAttemptRevision: null,
    discordOutboundAttemptToken: null,
    discordOutboundAttemptedAt: null,
    discordSyncState: "disabled" as const,
    googleAppliedCalendarId: null,
    googleAppliedDestination: null,
    googleAppliedRevision: null,
    googleId: null,
    googleLastError: null,
    googleOutboundAttemptRevision: null,
    googleOutboundAttemptToken: null,
    googleOutboundAttemptedAt: null,
    googleSyncState: "disabled" as const,
    publishedAt: null,
    syncLeaseExpiresAt: null,
    syncLeaseRevision: null,
    syncLeaseToken: null,
    visibilityDuesPaying: null,
    visibilityInternal: null,
    visibilityRevision: null,
    visibilityRoles: null,
  };
}

/** Disables retained publication intent without advancing an already inert row. */
export function hackathonPublicationSanitizerSql() {
  return `
UPDATE knight_hacks_hackathon_event_publication
SET desired_enabled = FALSE,
    requested_by = NULL,
    last_reconciled_at = NULL,
    last_converged_at = NULL,
    revision = revision + CASE WHEN desired_enabled THEN 1 ELSE 0 END,
    requested_at = CASE
      WHEN desired_enabled THEN CURRENT_TIMESTAMP
      ELSE requested_at
    END;
`;
}

/**
 * Removes form instructions whose backing MinIO objects are not part of the
 * database export while preserving text instructions and every other form key.
 */
export function formConfigurationSanitizerSql() {
  return `
UPDATE knight_hacks_form_schemas AS form
SET form_data = jsonb_set(
  form.form_data,
  '{instructions}',
  COALESCE(
    (
      SELECT jsonb_agg(instruction ORDER BY instruction_position)
      FROM jsonb_array_elements(form.form_data->'instructions')
        WITH ORDINALITY AS entry(instruction, instruction_position)
      WHERE instruction->>'type' = 'text'
        AND NOT (instruction ? 'attachmentId')
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof(form.form_data) = 'object'
  AND jsonb_typeof(form.form_data->'instructions') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(form.form_data->'instructions') AS instruction
    WHERE instruction->>'type' IS DISTINCT FROM 'text'
       OR instruction ? 'attachmentId'
  );
`;
}
