import { db } from "@forge/db/client";

import { KHIX_HACKATHON_NAMES } from "./portal-config";

export async function getKhixHackathon() {
  for (const name of KHIX_HACKATHON_NAMES) {
    const hackathon = await db.query.Hackathon.findFirst({
      where: (table, { eq }) => eq(table.name, name),
    });

    if (hackathon) {
      return { hackathon, name };
    }
  }

  return null;
}
