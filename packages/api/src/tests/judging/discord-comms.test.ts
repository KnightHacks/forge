import { describe, expect, it } from "vitest";

import {
  buildJudgingRoomMessage,
  judgingDiscordNonce,
  judgingRoomThreadName,
} from "../../utils/judging/discord-comms";

const memberOne = "111111111111111111";
const memberTwo = "222222222222222222";

describe("judging Discord messages", () => {
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
