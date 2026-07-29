import { hostname } from "node:os";
import { REST } from "discord.js";

import { discordArchiveDatabaseStore } from "@forge/api/discord-archive.server";
import { logger } from "@forge/utils";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

import { runDiscordArchiveCycle } from "../discord-archive/cycle";
import { createDiscordArchiveRestSource } from "../discord-archive/rest-source";
import { createDiscordArchiveWorker } from "../discord-archive/worker";
import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const owner = `${hostname()}:${process.pid}:cron`;

export const discordArchive = new CronBuilder({
  color: 5,
  name: "discord-archive",
}).addCron("* * * * *", async () => {
  if (!env.DISCORD_ARCHIVE_BOT_TOKEN) {
    logger.info("disabled: DISCORD_ARCHIVE_BOT_TOKEN is not configured");
    return;
  }

  const guildId = await getKnightHacksGuildId();
  const rest = new REST({ version: "10" }).setToken(
    env.DISCORD_ARCHIVE_BOT_TOKEN,
  );
  const source = createDiscordArchiveRestSource({
    guildId,
    rest,
  });
  const worker = createDiscordArchiveWorker({
    guildId,
    source,
    store: discordArchiveDatabaseStore,
  });
  const result = await runDiscordArchiveCycle({
    guildId,
    owner,
    store: discordArchiveDatabaseStore,
    worker,
  });

  if (!result.acquired) {
    logger.info("skipped: another archive worker owns the lease");
    return;
  }
  logger.info(
    `discovered=${result.discovered} backfillPages=${result.backfill.succeeded} backfillFailures=${result.backfill.failed} reconciledChannels=${result.reconciliation.succeeded} reconciliationFailures=${result.reconciliation.failed}`,
  );
});
