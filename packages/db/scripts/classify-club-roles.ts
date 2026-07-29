/**
 * Classifies linked Blade roles into the public Club roster, and says what it
 * did. Run it whenever the Club roster looks empty, and after linking new
 * Discord roles in Blade:
 *
 *   pnpm db:club-roles
 *   pnpm --filter=@forge/db classify:club-roles
 *
 * Migration `0026` backfills this classification once, at migrate time. Fresh
 * environments migrate an empty database, so that backfill classifies nothing
 * and the migration is recorded as applied — which used to leave no path at all
 * for roles linked afterwards. This is that path.
 *
 * It only inserts: never updates, never deletes. Running it twice is a no-op,
 * and a row an officer edited by hand is left exactly as they left it. See
 * `src/club-team/role-classification.ts` for why role names are a bootstrap
 * input here and not the source of truth.
 *
 * It is a report, not a gate: it exits 0 whether or not every configured role
 * resolved, because a half-linked Blade is the normal state during setup.
 */
import { db } from "../src/client";
import {
  classifyClubRoles,
  formatClubRoleClassificationReport,
} from "../src/club-team/role-classification";

const report = await classifyClubRoles(db.$client);

process.stdout.write(`${formatClubRoleClassificationReport(report)}\n`);

process.exitCode = 0;
await db.$client.end();
