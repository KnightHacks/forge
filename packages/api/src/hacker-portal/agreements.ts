import type { HackerAgreementAcceptanceInput } from "@forge/hacker-sdk/contracts";
import { and, eq } from "@forge/db";
import {
  HackathonAgreementDefinition,
  HackerAgreementAcceptance,
} from "@forge/db/schemas/knight-hacks";

import type { TransactionDb } from "../utils/db";
import { portalFailure } from "./trpc";

export async function validateAndWriteAgreements({
  acceptances,
  attendeeId,
  hackathonId,
  now,
  stage,
  tx,
}: {
  acceptances: readonly HackerAgreementAcceptanceInput[];
  attendeeId: string;
  hackathonId: string;
  now: Date;
  stage: "application" | "confirmation";
  tx: TransactionDb;
}) {
  const definitions = await tx
    .select({
      id: HackathonAgreementDefinition.id,
      required: HackathonAgreementDefinition.required,
    })
    .from(HackathonAgreementDefinition)
    .where(
      and(
        eq(HackathonAgreementDefinition.hackathonId, hackathonId),
        eq(HackathonAgreementDefinition.stage, stage),
        eq(HackathonAgreementDefinition.active, true),
      ),
    )
    .for("share");
  const byId = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const supplied = new Map<string, boolean>();
  for (const acceptance of acceptances) {
    if (
      supplied.has(acceptance.definitionId) ||
      !byId.has(acceptance.definitionId)
    ) {
      portalFailure(
        "INVALID_AGREEMENT",
        "The agreement selection is not current.",
        {
          trpcCode: "BAD_REQUEST",
        },
      );
    }
    supplied.set(acceptance.definitionId, acceptance.accepted);
  }
  if (
    definitions.some(
      (definition) =>
        definition.required && supplied.get(definition.id) !== true,
    )
  ) {
    portalFailure(
      "INVALID_AGREEMENT",
      "Accept every required agreement to continue.",
      {
        trpcCode: "BAD_REQUEST",
      },
    );
  }

  for (const acceptance of acceptances) {
    await tx
      .insert(HackerAgreementAcceptance)
      .values({
        accepted: acceptance.accepted,
        acceptedAt: acceptance.accepted ? now : null,
        agreementDefinitionId: acceptance.definitionId,
        attendeeId,
        hackathonId,
        provenance: "explicit" as const,
      })
      .onConflictDoUpdate({
        set: {
          accepted: acceptance.accepted,
          acceptedAt: acceptance.accepted ? now : null,
          provenance: "explicit",
          recordedAt: now,
        },
        target: [
          HackerAgreementAcceptance.attendeeId,
          HackerAgreementAcceptance.agreementDefinitionId,
        ],
      });
  }
}
