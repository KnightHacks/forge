/** Legacy MLH labels and the consolidated challenge both remain untimed. */
export function isMlhChallenge(label: string) {
  return label.toLocaleLowerCase("en-US").includes("mlh");
}

/** Only call when creating new imported memberships. Preserve original labels. */
export function importedChallengeLabels(prizeCategories: readonly string[]) {
  return Array.from(
    new Set([
      "General",
      ...prizeCategories.map((label) =>
        isMlhChallenge(label) ? "MLH Challenges" : label,
      ),
    ]),
  );
}
