/** Only call when creating new imported memberships. Preserve original labels. */
export function importedChallengeLabels(prizeCategories: readonly string[]) {
  return Array.from(new Set(prizeCategories));
}
/** Bootstrap labels and policies only; runtime behavior uses saved configuration. */
export const defaultJudgingChallenges = [
  {
    label: "General",
    isGeneral: true,
    isScheduled: true,
    importLabelMatch: null,
  },
  {
    label: "MLH Challenges",
    tagColor: "#e93227",
    isGeneral: false,
    isScheduled: false,
    importLabelMatch: "MLH",
  },
];
