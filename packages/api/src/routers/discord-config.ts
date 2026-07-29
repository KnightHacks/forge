import { TRPCError } from "@trpc/server";

import type { SelectDiscordConfig } from "@forge/db/schemas/discord-config";
import { DISCORD } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DiscordConfig,
  resolveDiscordConfigId,
} from "@forge/db/schemas/discord-config";
import { invalidateDiscordConfigCache } from "@forge/utils/discord-config";
import { discordConfigUpdateSchema } from "@forge/validators";

import type { AuditChangeInput } from "../utils/audit/service";
import { nodeEnv } from "../env";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { assertCanManagePlatformConfig } from "../utils/platform-config/access";

/**
 * Grouping order for the console, which is neither alphabetical nor the order
 * `DISCORD.CONFIG_KINDS` declares (that one is alphabetical). Rows sort by this
 * and then by their position in `DISCORD.CONFIG_KEYS`, server-side, so the
 * client never has to re-sort and cannot quietly start.
 */
const KIND_ORDER: readonly DISCORD.ConfigKind[] = ["guild", "channel", "role"];

const isProduction = nodeEnv === "production";

function toConfigView(row: SelectDiscordConfig) {
  return {
    description: row.description,
    developmentId: row.developmentId,
    key: row.key,
    kind: row.kind,
    label: row.label,
    productionId: row.productionId,
    // Reuses the schema's resolver rather than re-deriving the
    // `developmentId ?? productionId` fallback. That fallback is the reason the
    // column is nullable and it must not get a second implementation.
    resolvedId: resolveDiscordConfigId(row, isProduction),
    readBy: DISCORD.CONFIG_KEY_CONSUMERS[row.key],
    updatedAt: row.updatedAt,
  };
}

function byKindThenDeclaration(
  left: SelectDiscordConfig,
  right: SelectDiscordConfig,
) {
  // Grouping follows the `kind` column, not the key text, so renaming a key
  // never silently regroups the table.
  const kindDelta =
    KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
  if (kindDelta !== 0) return kindDelta;

  return (
    DISCORD.CONFIG_KEYS.indexOf(left.key) -
    DISCORD.CONFIG_KEYS.indexOf(right.key)
  );
}

function changedFields(
  before: SelectDiscordConfig,
  after: SelectDiscordConfig,
): AuditChangeInput[] {
  const fields = [
    "label",
    "description",
    "productionId",
    "developmentId",
  ] as const;

  // An audit row reads as a diff, not a snapshot: a column the officer left
  // alone contributes nothing.
  return fields
    .filter((field) => before[field] !== after[field])
    .map((field) => ({ after: after[field], before: before[field], field }));
}

export const discordConfigRouter = createTRPCRouter({
  /** Officer-only. Every Discord setting, grouped by kind, with what reads each one. */
  list: permProcedure.query(async ({ ctx }) => {
    assertCanManagePlatformConfig(ctx.session.permissions);
    const rows = await db.select().from(DiscordConfig);

    return {
      environment: isProduction
        ? ("production" as const)
        : ("development" as const),
      rows: rows.sort(byKindThenDeclaration).map(toConfigView),
    };
  }),

  /** Officer-only. Edits one setting's label, description, and snowflakes. */
  update: permProcedure
    .input(discordConfigUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(DiscordConfig)
          .where(eq(DiscordConfig.key, input.key))
          .limit(1)
          .for("update");
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "This setting has no row yet. It is created by a migration, not here.",
          });
        }

        // Checked here rather than in Zod because "did a snowflake actually
        // change" needs the stored row. Editing only the guild row's label or
        // description changes nothing any consumer resolves, so it does not
        // need the acknowledgement.
        const repointsGuild =
          input.key === "guild" &&
          (input.productionId !== row.productionId ||
            input.developmentId !== row.developmentId);
        if (repointsGuild && !input.acknowledgeGuildRepoint) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Repointing the guild redirects every Discord consumer at another server. Confirm the change first.",
          });
        }

        const [next] = await tx
          .update(DiscordConfig)
          // `updatedAt` refreshes itself through `$onUpdate`.
          .set({
            description: input.description,
            developmentId: input.developmentId,
            label: input.label,
            productionId: input.productionId,
          })
          .where(eq(DiscordConfig.key, input.key))
          .returning();
        if (!next) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This setting has no row yet.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "discord_config.updated",
            actor: auditActor,
            changes: changedFields(row, next),
            metadata: {
              configKey: row.key,
              configKind: row.kind,
              guildRepointAcknowledged: input.acknowledgeGuildRepoint,
              isInert: DISCORD.INERT_CONFIG_KEYS.includes(row.key),
            },
            subjects: [
              {
                relation: "primary",
                targetId: row.key,
                targetLabel: row.label,
                targetType: "discord_config",
              },
            ],
          },
          tx,
        );

        return toConfigView(next);
      });

      // After the commit, never inside it. Clearing the snapshot mid-transaction
      // lets a concurrent read in this process repopulate it from the pre-commit
      // values, and this process would then serve its own stale id for the full
      // sixty-second TTL — the exact failure this call exists to prevent.
      //
      // Unconditional: a label-only edit invalidates too, so a future consumer
      // reading a label is not served a stale one.
      invalidateDiscordConfigCache();

      return updated;
    }),
});
