import type {
  HackerAgreementAcceptanceDto,
  HackerAgreementAcceptanceInput,
  HackerAgreementDefinitionDto,
} from "@forge/hacker-sdk";

export function agreementIsAccepted(
  definitionId: string,
  choices: Readonly<Record<string, boolean>>,
  existing: readonly Pick<
    HackerAgreementAcceptanceDto,
    "accepted" | "definitionId"
  >[] = [],
) {
  return (
    choices[definitionId] ??
    existing.some(
      (acceptance) =>
        acceptance.definitionId === definitionId && acceptance.accepted,
    )
  );
}

export function buildDisplayedAgreementInputs(
  definitions: readonly HackerAgreementDefinitionDto[],
  choices: Readonly<Record<string, boolean>>,
  existing: readonly Pick<
    HackerAgreementAcceptanceDto,
    "accepted" | "definitionId"
  >[] = [],
): HackerAgreementAcceptanceInput[] {
  return definitions.map((definition) => ({
    accepted: agreementIsAccepted(definition.id, choices, existing),
    definitionId: definition.id,
  }));
}

export function requiredAgreementsAccepted(
  definitions: readonly HackerAgreementDefinitionDto[],
  choices: Readonly<Record<string, boolean>>,
  existing: readonly Pick<
    HackerAgreementAcceptanceDto,
    "accepted" | "definitionId"
  >[] = [],
) {
  return definitions
    .filter((definition) => definition.required)
    .every((definition) =>
      agreementIsAccepted(definition.id, choices, existing),
    );
}
