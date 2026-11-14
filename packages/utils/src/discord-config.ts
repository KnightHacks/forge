//
// Read path for officer-managed Discord configuration.
//
// Lives here rather than in `@forge/api` because `@forge/utils/discord` — which
// `@forge/api` depends on — is itself a consumer, so putting it in the API layer
// would invert the dependency. It cannot live in `@forge/db` either: that
// package owns schemas, the client, and migrations, not queries.
//

import type { DISCORD } from "@forge/consts";
import type { SelectDiscordConfig } from "@forge/db/schemas/discord-config";
import { db } from "@forge/db/client";
import {
  DiscordConfig,
  resolveDiscordConfigId,
} from "@forge/db/schemas/discord-config";

/**
 * The whole table is a small set of narrow rows, cached as a unit rather than
 * per key: `role-sync` touches the guild ID once per user and the Discord bot
 * reads it on every interaction, and neither should pay for a round trip.
 *
 * Invalidation is time-based, matching `liveRoleDiscordGateway`'s role-count
 * cache. Blade's officer update calls {@link invalidateDiscordConfigCache}
 * after committing. Because `apps/cron`, `apps/tk`, and each Blade server
 * instance hold separate caches, that call only clears the process that served
 * the request; the others still converge within the TTL.
 */
const CACHE_TTL_MS = 60_000;

type ConfigRow = Pick<
  SelectDiscordConfig,
  "developmentId" | "key" | "productionId"
>;

interface ConfigSnapshot {
  expiresAt: number;
  rows: Map<string, ConfigRow>;
}

let snapshot: ConfigSnapshot | undefined;
/** Shared between concurrent callers so a cold cache issues one query, not N. */
let inFlight: Promise<ConfigSnapshot> | undefined;

function isProduction(): boolean {
  // Read at call time rather than module load. The constants this replaced were
  // frozen at import, which meant a process that set NODE_ENV late — or a test
  // that wanted to exercise the production branch — silently got the wrong one.
  return process.env.NODE_ENV === "production";
}

async function loadSnapshot(): Promise<ConfigSnapshot> {
  const rows = await db
    .select({
      developmentId: DiscordConfig.developmentId,
      key: DiscordConfig.key,
      productionId: DiscordConfig.productionId,
    })
    .from(DiscordConfig);

  return {
    expiresAt: Date.now() + CACHE_TTL_MS,
    rows: new Map(rows.map((row) => [row.key, row])),
  };
}

async function readSnapshot(): Promise<ConfigSnapshot> {
  if (snapshot && snapshot.expiresAt > Date.now()) return snapshot;
  inFlight ??= loadSnapshot()
    .then((loaded) => {
      snapshot = loaded;
      return loaded;
    })
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}

/**
 * Drops the cached snapshot. Call this after writing to
 * `knight_hacks_discord_config` so the writing process does not serve its own
 * stale value back.
 */
export function invalidateDiscordConfigCache(): void {
  snapshot = undefined;
  inFlight = undefined;
}

/**
 * Resolves one setting to the Discord snowflake for the current environment.
 *
 * A missing row means the migration did not run and always throws. An explicit
 * null value is an intentionally unconfigured destination; the public reader
 * chooses whether to allow it or throw.
 */
async function readDiscordConfigId(
  key: DISCORD.ConfigKey,
): Promise<string | null> {
  const { rows } = await readSnapshot();
  const row = rows.get(key);
  if (!row) {
    throw new Error(
      `Discord config "${key}" has no row in knight_hacks_discord_config. Run pnpm --filter=@forge/db migrate.`,
    );
  }
  return resolveDiscordConfigId(row, isProduction());
}

/** Required reads always yield a snowflake or throw, including for optional keys. */
export async function getDiscordConfigId(
  key: DISCORD.ConfigKey,
): Promise<string> {
  const id = await readDiscordConfigId(key);
  if (id === null) {
    throw new Error(`Discord config "${key}" is not configured.`);
  }
  return id;
}

/**
 * Explicitly permits an unconfigured destination. A missing row still throws:
 * migration/setup errors must not silently disable alerts. Consumers should
 * skip only the Discord send when this returns null, preserving ordinary work
 * and error logging.
 */
export function getOptionalDiscordConfigId(
  key: DISCORD.OptionalConfigKey,
): Promise<string | null> {
  return readDiscordConfigId(key);
}

/** Convenience for the hottest lookup in the codebase. */
export function getKnightHacksGuildId(): Promise<string> {
  return getDiscordConfigId("guild");
}
