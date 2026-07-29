import { z } from "zod";

import { DISCORD, TEAM } from "@forge/consts";

import { discordSnowflakeSchema } from "./discord-archive";
import { roleUuidSchema } from "./role-management";

//
// Inputs for the officer-facing platform configuration console: the
// `knight_hacks_discord_config` rows and a Blade role's `knight_hacks_club_team_role`
// classification.
//
// Three of the columns these write are nullable, and `NULL` means something
// specific in each of them. A cleared `<Input>` yields `""`, so the coercion has
// to happen here — the client binds `value={draft.field ?? ""}` and sends it raw.
//

const emptyToNull = (value: string | null) => (value === "" ? null : value);

/**
 * Reuses the shared snowflake pattern rather than copying it — there are already
 * five copies of `/^\d{17,20}$/` in this package.
 *
 * The `.trim()` in front of it is the officer path: these values are pasted out
 * of Discord, and a trailing space is the realistic way this table gets broken.
 * Normalizing it beats surfacing the name of a Postgres check constraint.
 */
export const configSnowflakeSchema = z
  .string()
  .trim()
  .pipe(discordSnowflakeSchema);

/**
 * `NULL` in `developmentId` means "reuse `productionId`", so an officer clearing
 * the field is expressing that rule rather than making a mistake. The empty
 * string is coerced before the pattern runs, because `""` would fail it.
 */
export const optionalConfigSnowflakeSchema = z
  .string()
  .trim()
  .nullable()
  .transform(emptyToNull)
  .pipe(discordSnowflakeSchema.nullable());

/**
 * `NULL` in `rosterLabel`/`calloutLabel` means "fall back" — to the team's label
 * for a plain team member, to the role name for everyone else.
 *
 * Storing `""` instead is a real bug, not untidiness: `getClubRosterLabel` tests
 * truthiness, so the roster would fall back anyway while the console kept showing
 * an override that is not there. A whitespace-only value is worse, because it is
 * truthy — it renders a blank label on the public site with no error.
 */
export const clubClassificationLabelSchema = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .transform(emptyToNull);

export const discordConfigUpdateSchema = z
  .object({
    key: z
      .enum(DISCORD.CONFIG_KEYS)
      .describe("Which setting to edit. Keys are a code contract, not input."),
    label: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .describe('Human-facing name for the setting, e.g. "Alumni role".'),
    description: z
      .string()
      .trim()
      .min(1)
      .max(1_000)
      // The column is `text`; 1000 is an abuse bound rather than a schema mirror.
      .describe("What this setting controls and what breaks when it is wrong."),
    productionId: configSnowflakeSchema.describe(
      "Discord snowflake used when NODE_ENV is production.",
    ),
    developmentId: optionalConfigSnowflakeSchema.describe(
      "Discord snowflake used outside production. Empty means reuse the production one.",
    ),
    acknowledgeGuildRepoint: z
      .boolean()
      .default(false)
      // Consulted only for the `guild` key, and only when a snowflake actually
      // changes — which needs the stored row, so the procedure decides, not this.
      .describe(
        "Confirms the officer accepts repointing every Discord consumer at another server.",
      ),
  })
  .strict();

export const clubClassificationUpdateSchema = z
  .object({
    roleId: roleUuidSchema.describe(
      "The Blade role being classified. Never the role name — names are display data.",
    ),
    kind: z
      .enum(TEAM.CLUB_TEAM_KINDS)
      .describe("Which roster bucket the role's holders land in."),
    rank: z
      .number()
      .int()
      .min(0)
      .max(1_000)
      // The column is a plain integer with no constraint. The bound exists so a
      // typo cannot produce a sort key nobody will find.
      .describe("Sort position inside this role's primary bucket."),
    teamId: z
      .string()
      .uuid()
      .nullable()
      .describe("The team this role belongs to, or leads. Null for neither."),
    rosterLabel: clubClassificationLabelSchema.describe(
      "Overrides the label on the member's public roster card. Empty falls back.",
    ),
    calloutLabel: clubClassificationLabelSchema.describe(
      "Overrides the badge on a Guild profile. Empty falls back.",
    ),
  })
  .strict()
  .superRefine((input, ctx) => {
    // Mirrors `knight_hacks_club_team_role_team_check` so the officer gets a
    // field message rather than a raw constraint violation.
    if (input.kind === "team" && input.teamId === null) {
      ctx.addIssue({
        code: "custom",
        message:
          "A team classification must name a team. Without one it resolves to no roster bucket and its holders vanish from the public site.",
        path: ["teamId"],
      });
    }
  });
