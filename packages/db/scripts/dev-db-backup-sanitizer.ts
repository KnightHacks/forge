import { TEAM } from "@forge/consts";

export const MEMBERS_OF_THE_TEAM_ROLE_NAMES = TEAM.CLUB_ROSTER_ROLE_NAMES;

export const TABLES_TO_KEEP = [
  "auth_account",
  "auth_permissions",
  "auth_roles",
  "auth_user",
  "email_template",
  "email_template_revision",
  "knight_hacks_alumni_bulletin_post",
  "knight_hacks_challenges",
  "knight_hacks_companies",
  "knight_hacks_company",
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
  "knight_hacks_hackathon_sponsor",
  "knight_hacks_hacker",
  "knight_hacks_hacker_attendee",
  "knight_hacks_hacker_event_attendee",
  "knight_hacks_member",
  "knight_hacks_sponsor",
  "knight_hacks_submissions",
  "knight_hacks_teams",
  "knight_hacks_trpc_form_connection",
] as const;

/**
 * Removes non-team people after non-retained tables have been truncated.
 *
 * "Members of the team" are users with an officer, director, or configured
 * team role from the canonical club roster. All of that user's remaining roles
 * and product data are kept.
 */
export function teamDataSanitizerSql() {
  const membersOfTheTeamRoleNames = MEMBERS_OF_THE_TEAM_ROLE_NAMES.map(
    (name) => `'${name.replaceAll("'", "''")}'`,
  ).join(",\n  ");

  return `
CREATE TEMP TABLE "forge_team_user" AS
SELECT DISTINCT permission.user_id
FROM auth_permissions AS permission
INNER JOIN auth_roles AS role ON role.id = permission.role_id
WHERE role.name IN (
  ${membersOfTheTeamRoleNames}
);

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
