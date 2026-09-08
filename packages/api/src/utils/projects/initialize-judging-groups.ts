import { and, eq } from "@forge/db";
import {
  HackathonJudgingConfiguration,
  ProjectChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import { defaultJudgingChallenges } from "./challenge-labels";

/** Initialize once inside the hackathon creation or locked import transaction. */
export async function initializeJudgingGroups(
  tx: WriteDb,
  hackathonId: string,
) {
  const groupSetup = await tx.query.HackathonJudgingConfiguration.findFirst({
    where: eq(HackathonJudgingConfiguration.hackathonId, hackathonId),
  });
  if (!groupSetup?.challengeGroupsInitializedAt) {
    const configuredMlhDefault = await tx.query.ProjectChallenge.findFirst({
      columns: { id: true },
      where: and(
        eq(ProjectChallenge.hackathonId, hackathonId),
        eq(ProjectChallenge.isGroup, true),
        eq(ProjectChallenge.importLabelMatch, "MLH"),
      ),
    });
    await tx
      .insert(ProjectChallenge)
      .values(
        defaultJudgingChallenges.map((group) => ({
          ...group,
          importLabelMatch: configuredMlhDefault
            ? null
            : group.importLabelMatch,
          hackathonId,
          isGroup: true,
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(HackathonJudgingConfiguration)
      .values({
        hackathonId,
        challengeGroupsInitializedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: HackathonJudgingConfiguration.hackathonId,
        set: { challengeGroupsInitializedAt: new Date() },
      });
  }
}
