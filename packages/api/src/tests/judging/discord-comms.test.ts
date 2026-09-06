import { describe, expect, it } from "vitest";

import {
  authorizedJudgingDiscordIds,
  buildJudgingRoomMessage,
  buildJudgingRoomMessages,
  judgingDiscordNonce,
  judgingRoomThreadName,
  withJudgingRecipientMentions,
} from "../../utils/judging/discord-comms";
import { permissionKeysToBitstring } from "../../utils/roles/management";

const memberOne = "111111111111111111";
const memberTwo = "222222222222222222";

describe("judging Discord messages", () => {
  it("keeps only current judge and officer permission holders", () => {
    const recipients = authorizedJudgingDiscordIds([
      {
        discordUserId: memberOne,
        permissions: permissionKeysToBitstring(["IS_JUDGE"]),
      },
      {
        discordUserId: memberTwo,
        permissions: permissionKeysToBitstring(["IS_OFFICER"]),
      },
      {
        discordUserId: "333333333333333333",
        permissions: permissionKeysToBitstring(["READ_MEMBERS"]),
      },
      {
        discordUserId: memberOne,
        permissions: permissionKeysToBitstring(["READ_MEMBERS"]),
      },
    ]);

    expect(recipients).toEqual([memberOne, memberTwo]);
  });

  it("limits inactive-hackathon recipients to officers", () => {
    const recipients = authorizedJudgingDiscordIds(
      [
        {
          discordUserId: memberOne,
          permissions: permissionKeysToBitstring(["IS_JUDGE"]),
        },
        {
          discordUserId: memberTwo,
          permissions: permissionKeysToBitstring(["IS_OFFICER"]),
        },
      ],
      false,
    );

    expect(recipients).toEqual([memberTwo]);
  });

  it("uses a Discord-safe nonce", () => {
    const nonce = judgingDiscordNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(nonce.length).toBeLessThanOrEqual(25);
  });

  it("mentions only the member who newly selected the room", () => {
    const message = buildJudgingRoomMessage({
      notice: {
        discordUserId: memberOne,
        kind: "member_joined",
        memberName: "Casey",
      },
      recipientIds: [memberTwo],
      roomName: "Sponsor suite A",
    });

    expect(message.allowedMentions).toEqual({
      parse: [],
      users: [memberOne],
    });
    expect(message.content).toContain(`<@${memberOne}>`);
    expect(message.content).not.toContain(memberTwo);
  });

  it("announces a named guest to every current member judge", () => {
    const message = buildJudgingRoomMessage({
      notice: {
        guestName: "Taylor Sponsor",
        kind: "guest_joined",
      },
      recipientIds: [memberTwo, memberOne],
      roomName: "Sponsor suite A",
    });

    expect(message.allowedMentions.users).toEqual([memberOne, memberTwo]);
    expect(message.content).toContain("Taylor Sponsor");
    expect(message.content).toContain(`<@${memberOne}>`);
    expect(message.content).toContain(`<@${memberTwo}>`);
  });

  it("builds an urgent room announcement with safe member mentions", () => {
    const messages = buildJudgingRoomMessages({
      notice: {
        isUrgent: true,
        kind: "announcement",
        message: "Stop judging and return to @here.",
      },
      recipientIds: [memberTwo, memberOne],
      roomName: "Sponsor suite A",
    });
    const message = messages[0];

    expect(message?.allowedMentions.users).toEqual([memberOne, memberTwo]);
    expect(message?.content).toContain("Urgent judging announcement");
    expect(message?.content).toContain("Stop judging");
    expect(message?.content).not.toContain("@here");
  });

  it("delivers every escaped character in a maximum-length announcement", () => {
    const recipients = Array.from({ length: 101 }, (_, index) =>
      (10_000_000_000_000_000_000n + BigInt(index)).toString(),
    );
    const messages = buildJudgingRoomMessages({
      notice: {
        isUrgent: true,
        kind: "announcement",
        message: "`".repeat(1000),
      },
      recipientIds: recipients,
      roomName: "*".repeat(120),
    });

    expect(messages.length).toBeGreaterThan(1);
    expect(messages.every((message) => message.content.length <= 2000)).toBe(
      true,
    );
    expect(
      messages
        .map((message) => message.content)
        .join("")
        .match(/\\`/g),
    ).toHaveLength(1000);
    expect(
      messages.flatMap((message) => message.allowedMentions.users).sort(),
    ).toEqual(recipients.sort());
  });

  it("preserves a long notice and pings every large-audience recipient", () => {
    const recipients = Array.from({ length: 101 }, (_, index) =>
      (10_000_000_000_000_000_000n + BigInt(index)).toString(),
    );
    const notice = "A".repeat(1000);
    const messages = withJudgingRecipientMentions(
      {
        allowedMentions: { parse: [], users: [] },
        content: notice,
      },
      recipients,
    );

    expect(messages[0]?.content).toBe(notice);
    expect(messages.every((message) => message.content.length <= 2000)).toBe(
      true,
    );
    expect(
      messages.every((message) => message.allowedMentions.users.length <= 100),
    ).toBe(true);
    expect(
      messages.flatMap((message) => message.allowedMentions.users).sort(),
    ).toEqual(recipients.sort());
  });

  it("attaches a large-audience QR only to the canonical message", () => {
    const recipients = Array.from({ length: 101 }, (_, index) =>
      (10_000_000_000_000_000_000n + BigInt(index)).toString(),
    );
    const messages = buildJudgingRoomMessages({
      notice: {
        kind: "qr",
        qrCodeUrl: "data:image/png;base64,aGVsbG8=",
        reason: "sent",
        url: "https://example.test/judge/activate/signed",
      },
      recipientIds: recipients,
      roomName: "Sponsor suite A",
    });

    expect(messages.filter((message) => message.file)).toHaveLength(1);
    expect(
      messages.flatMap((message) => message.allowedMentions.users).sort(),
    ).toEqual(recipients.sort());
  });

  it("resends a QR with current recipients and a PNG attachment", () => {
    const message = buildJudgingRoomMessage({
      notice: {
        kind: "qr",
        qrCodeUrl: "data:image/png;base64,aGVsbG8=",
        reason: "sent",
        url: "http://localhost:3000/judge/activate/link?signature=signed",
      },
      recipientIds: [memberTwo],
      roomName: "Sponsor suite A",
    });

    expect(message.allowedMentions.users).toEqual([memberTwo]);
    expect(message.content).toContain("current guest judging QR");
    expect(message.file).toMatchObject({ name: "sponsor-suite-a-qr.png" });
    expect(message.file?.data.toString()).toBe("hello");
  });

  it("neutralizes names without widening allowed mentions", () => {
    const message = buildJudgingRoomMessage({
      notice: {
        actorName: "@everyone <@333333333333333333>",
        guestName: "@here",
        kind: "guest_revoked",
      },
      recipientIds: [memberOne, "invalid"],
      roomName: "**Room** <@&444444444444444444>",
    });

    expect(message.allowedMentions.users).toEqual([memberOne]);
    expect(message.content).not.toContain("@everyone");
    expect(message.content).not.toContain("@here");
    expect(message.content).not.toContain("<@333333333333333333>");
    expect(message.content).not.toContain("<@&444444444444444444>");
  });

  it("sanitizes and limits room thread names", () => {
    const name = judgingRoomThreadName(
      `Sponsor\nSuite @everyone <@123> ${"x".repeat(120)}`,
    );
    expect(name).not.toContain("\n");
    expect(name).not.toContain("@everyone");
    expect(name).toHaveLength(100);
  });
});
