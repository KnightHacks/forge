export const CHALLENGE_MODES = ["scheduled", "unscheduled", "remote"] as const;

export type ChallengeMode = (typeof CHALLENGE_MODES)[number];
