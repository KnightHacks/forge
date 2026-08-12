import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { DuesConfiguration } from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

export const DUES_CONFIGURATION_ID = "global";

export async function getDuesPaymentsEnabled(database: WriteDb = db) {
  const configuration = await database.query.DuesConfiguration.findFirst({
    columns: {
      paymentsEnabled: true,
    },
    where: eq(DuesConfiguration.id, DUES_CONFIGURATION_ID),
  });

  return configuration?.paymentsEnabled ?? false;
}
