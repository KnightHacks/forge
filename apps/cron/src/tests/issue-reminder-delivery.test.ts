import { ComponentType, MessageFlags } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";

import {
  DEVELOPMENT_ISSUE_REMINDER_CC,
  issueReminderCcBody,
  issueReminderComponentsBody,
} from "../crons/issue-reminder-delivery";

const allowedMentions = {
  parse: [] as string[],
  roles: ["222222222222222222"],
  users: ["111111111111111111"],
};
const content = "cc: <@111111111111111111> <@&222222222222222222>";

describe("issue reminder Discord delivery", () => {
  it("permits only explicit reminder targets in production", () => {
    expect(
      issueReminderCcBody({
        allowedMentions,
        content,
        nodeEnv: "production",
      }),
    ).toEqual({
      allowed_mentions: allowedMentions,
      content,
    });
  });

  it.each(["development", "test"] as const)(
    "removes mention syntax and disables notifications in %s",
    (nodeEnv) => {
      const body = issueReminderCcBody({
        allowedMentions,
        content,
        nodeEnv,
      });
      expect(body).toEqual({
        allowed_mentions: { parse: [] },
        content: DEVELOPMENT_ISSUE_REMINDER_CC,
      });
      expect(body.content).not.toMatch(/<@/);
    },
  );

  it("puts a non-pinging development cc below the reminder container", () => {
    const container = {
      components: [
        {
          content: "## Development Team · Issue reminders",
          type: ComponentType.TextDisplay as const,
        },
      ],
      type: ComponentType.Container as const,
    };
    const body = issueReminderComponentsBody({
      allowedMentions,
      components: [container],
      content,
      nodeEnv: "development",
    });
    expect(body).toEqual({
      allowed_mentions: { parse: [] },
      components: [
        container,
        {
          content: DEVELOPMENT_ISSUE_REMINDER_CC,
          type: ComponentType.TextDisplay,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    expect(JSON.stringify(body)).not.toMatch(/<@/);
  });

  it("retains explicit production mentions in the bottom text display", () => {
    const body = issueReminderComponentsBody({
      allowedMentions,
      components: [
        {
          components: [],
          type: ComponentType.Container,
        },
      ],
      content,
      nodeEnv: "production",
    });
    expect(body).toMatchObject({
      allowed_mentions: allowedMentions,
      components: [
        {
          type: ComponentType.Container,
        },
        {
          content,
          type: ComponentType.TextDisplay,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  });
});
