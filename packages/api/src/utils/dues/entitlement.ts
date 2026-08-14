import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { DuesEntitlement } from "@forge/db/schemas/knight-hacks";
import { getDuesAcademicYear } from "@forge/validators";

import type { WriteDb } from "../db";

export async function hasCurrentDuesEntitlement(
  memberId: string,
  database: WriteDb = db,
  referenceDate = new Date(),
) {
  const academicYear = getDuesAcademicYear(referenceDate);
  const entitlement = await database.query.DuesEntitlement.findFirst({
    columns: { id: true },
    where: and(
      eq(DuesEntitlement.memberId, memberId),
      eq(DuesEntitlement.year, academicYear.startYear),
      eq(DuesEntitlement.active, true),
    ),
  });

  return Boolean(entitlement);
}
