import type { APIMessageTopLevelComponent } from "discord-api-types/v10";
import { ComponentType, MessageFlags } from "discord-api-types/v10";

export const DEVELOPMENT_ISSUE_REMINDER_CC =
  "cc: notifications disabled outside production";

export function issueReminderCcBody<TAllowedMentions>({
  allowedMentions,
  content,
  nodeEnv,
}: {
  allowedMentions: TAllowedMentions;
  content: string;
  nodeEnv: "development" | "production" | "test";
}) {
  return nodeEnv === "production"
    ? {
        allowed_mentions: allowedMentions,
        content,
      }
    : {
        allowed_mentions: { parse: [] as string[] },
        content: DEVELOPMENT_ISSUE_REMINDER_CC,
      };
}

export function issueReminderComponentsBody<TAllowedMentions>({
  allowedMentions,
  components,
  content,
  nodeEnv,
}: {
  allowedMentions: TAllowedMentions;
  components: APIMessageTopLevelComponent[];
  content: string;
  nodeEnv: "development" | "production" | "test";
}) {
  if (components.length === 0) return null;
  const cc = issueReminderCcBody({ allowedMentions, content, nodeEnv });
  return {
    allowed_mentions: cc.allowed_mentions,
    components: [
      ...components,
      {
        content: cc.content,
        type: ComponentType.TextDisplay,
      },
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}
