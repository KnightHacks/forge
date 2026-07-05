import type {
  HackathonEmailKind,
  HackathonEmailTemplatePresetKey,
} from "./templates";
import type {
  BuildHackathonEmailInput,
  BuiltHackathonEmail,
  HackathonEmailHackathonContext,
} from "./types";
import {
  DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY,
  HACKATHON_EMAIL_TEMPLATE_IDS,
  HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS,
} from "./templates";

function getKnownHackathonEmailTemplatePresetKey(
  presetKey?: string | null,
): HackathonEmailTemplatePresetKey {
  if (
    presetKey &&
    HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS.includes(
      presetKey as HackathonEmailTemplatePresetKey,
    )
  ) {
    return presetKey as HackathonEmailTemplatePresetKey;
  }

  return DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY;
}

export function getHackathonEmailTemplateId({
  emailTemplateKey,
  kind,
}: Pick<HackathonEmailHackathonContext, "emailTemplateKey"> & {
  kind: HackathonEmailKind;
}) {
  const presetKey = getKnownHackathonEmailTemplatePresetKey(emailTemplateKey);
  return HACKATHON_EMAIL_TEMPLATE_IDS[presetKey][kind];
}

function cleanTemplateData(data: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(data).filter((entry): entry is [string, string] => {
      const [, value] = entry;
      return typeof value === "string" && value.length > 0;
    }),
  );
}

function getHackathonEmailSubject({
  hackathon,
  kind,
}: Pick<BuildHackathonEmailInput, "hackathon" | "kind">): string {
  switch (kind) {
    case "Accepted":
      return `[ACTION REQUIRED] ${hackathon.displayName} Acceptance Information!`;
    case "AcceptedReminder":
      return `[REMINDER] Confirm your ${hackathon.displayName} acceptance`;
    case "Apply":
      return `${hackathon.displayName} - We received your application!`;
    case "Blacklist":
    case "Capacity":
      return `${hackathon.displayName} Status Update`;
    case "Confirmation":
      return `See you at ${hackathon.displayName}!`;
    case "Waitlist":
      return `${hackathon.displayName} Waitlist Information`;
    default: {
      const exhaustiveKind: never = kind;
      throw new Error(
        `Unhandled hackathon email kind: ${String(exhaustiveKind)}`,
      );
    }
  }
}

function getHackathonTemplateData({
  hackathon,
}: Pick<BuildHackathonEmailInput, "hackathon">) {
  return {
    hackathon: hackathon.displayName,
    hackathonName: hackathon.displayName,
    hackathonRouteName: hackathon.routeName,
    hackathonTheme: hackathon.theme,
  };
}

export function buildHackathonEmail({
  data,
  from,
  hackathon,
  kind,
  recipient,
}: BuildHackathonEmailInput): BuiltHackathonEmail {
  const subject = getHackathonEmailSubject({ hackathon, kind });

  return {
    data: cleanTemplateData({
      name: recipient.name,
      ...getHackathonTemplateData({ hackathon }),
      ...data,
    }),
    from,
    subject,
    template_id: getHackathonEmailTemplateId({
      emailTemplateKey: hackathon.emailTemplateKey,
      kind,
    }),
    to: recipient.to,
  };
}

export type {
  BuildHackathonEmailInput,
  BuiltHackathonEmail,
  HackathonEmailHackathonContext,
} from "./types";

export {
  DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY,
  HACKATHON_EMAIL_KINDS,
  HACKATHON_EMAIL_TEMPLATE_IDS,
  HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS,
  HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS,
  HACKATHON_TEMPLATE_IDS,
  type HackathonEmailKind,
  type HackathonEmailTemplatePresetKey,
} from "./templates";
