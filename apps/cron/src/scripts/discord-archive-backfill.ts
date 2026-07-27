import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { REST } from "discord.js";

import { discordArchiveDatabaseStore } from "@forge/api/discord-archive.server";
import { DISCORD } from "@forge/consts";
import { logger } from "@forge/utils";

import { runDiscordArchiveInitialBackfill } from "../discord-archive/cycle";
import { createDiscordArchiveRestSource } from "../discord-archive/rest-source";
import { createDiscordArchiveWorker } from "../discord-archive/worker";
import { env } from "../env";

async function main() {
  if (!env.DISCORD_ARCHIVE_BOT_TOKEN) {
    throw new Error("DISCORD_ARCHIVE_BOT_TOKEN is required for backfill.");
  }

  const rest = new REST({ version: "10" }).setToken(
    env.DISCORD_ARCHIVE_BOT_TOKEN,
  );
  const source = createDiscordArchiveRestSource({
    guildId: DISCORD.KNIGHTHACKS_GUILD,
    includeArchivedThreads: true,
    rest,
  });
  const worker = createDiscordArchiveWorker({
    channelBatchSize: 25,
    guildId: DISCORD.KNIGHTHACKS_GUILD,
    source,
    store: discordArchiveDatabaseStore,
  });
  const result = await runDiscordArchiveInitialBackfill({
    guildId: DISCORD.KNIGHTHACKS_GUILD,
    onRound: ({ failed, round, selected, succeeded }) => {
      if (round === 1 || round % 10 === 0 || selected === 0 || failed > 0) {
        logger.info(
          `round=${round} selected=${selected} succeeded=${succeeded} failed=${failed}`,
        );
      }
    },
    owner: `${hostname()}:${process.pid}:initial:${randomUUID()}`,
    store: discordArchiveDatabaseStore,
    worker,
  });

  if (!result.acquired) {
    logger.info(
      "Backfill skipped because another archive worker owns the lease.",
    );
    return;
  }
  logger.info(
    `Backfill complete: discovered=${result.discovered} pages=${result.pages} reconciled=${result.reconciliation.succeeded} reconciliationFailures=${result.reconciliation.failed}`,
  );
}

main().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
