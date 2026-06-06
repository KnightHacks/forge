import type { HackathonEmailKind } from "./templates";

export interface HackathonEmailHackathonContext {
  applicationBackgroundKey?: string | null;
  displayName: string;
  emailTemplateKey?: string | null;
  routeName?: string | null;
  theme?: string | null;
}

export interface HackathonEmailRecipientContext {
  name: string;
  to: string | string[];
}

export interface BuildHackathonEmailInput {
  data?: Record<string, string | null | undefined>;
  from?: string;
  hackathon: HackathonEmailHackathonContext;
  kind: HackathonEmailKind;
  recipient: HackathonEmailRecipientContext;
}

export interface BuiltHackathonEmail {
  data: Record<string, string>;
  from?: string;
  subject: string;
  template_id: number;
  to: string | string[];
}
