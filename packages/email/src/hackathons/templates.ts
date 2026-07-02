export const HACKATHON_EMAIL_KINDS = [
  "Blacklist",
  "Accepted",
  "AcceptedReminder",
  "Apply",
  "Capacity",
  "Confirmation",
  "Waitlist",
] as const;

export type HackathonEmailKind = (typeof HACKATHON_EMAIL_KINDS)[number];

export const HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS = [
  {
    key: "knight-hacks-viii",
    label: "Knight Hacks VIII",
  },
  {
    key: "bloomknights",
    label: "BloomKnights",
  },
] as const;

export type HackathonEmailTemplatePresetKey =
  (typeof HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS)[number]["key"];

export const HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS =
  HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS.map((preset) => preset.key) as [
    HackathonEmailTemplatePresetKey,
    ...HackathonEmailTemplatePresetKey[],
  ];

export const DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY =
  "knight-hacks-viii" satisfies HackathonEmailTemplatePresetKey;

export const HACKATHON_EMAIL_TEMPLATE_IDS = {
  "knight-hacks-viii": {
    Blacklist: 6,
    Accepted: 7,
    // TODO: replace with the dedicated reminder template ID when it is ready.
    AcceptedReminder: 7,
    Apply: 8,
    Capacity: 9,
    Confirmation: 10,
    Waitlist: 11,
  },
  bloomknights: {
    Blacklist: 14,
    Accepted: 15,
    AcceptedReminder: 21,
    Apply: 16,
    Capacity: 17,
    Confirmation: 18,
    Waitlist: 19,
  },
} as const satisfies Record<
  HackathonEmailTemplatePresetKey,
  Record<HackathonEmailKind, number>
>;

export const HACKATHON_TEMPLATE_IDS = HACKATHON_EMAIL_TEMPLATE_IDS[
  DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY
] satisfies Record<HackathonEmailKind, number>;
