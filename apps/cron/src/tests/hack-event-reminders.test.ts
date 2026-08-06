import { describe, expect, it, vi } from "vitest";

import type { HackReminderDelivery } from "../crons/hack-reminder-logic";
import {
  buildHackReminderMessage,
  classifyHackReminderFailure,
  createHackReminderExecutor,
} from "../crons/hack-reminder-logic";

const DELIVERY: HackReminderDelivery = {
  channelId: "11111111111111111",
  deliveryId: "delivery-1",
  description: "Food is ready.",
  discordEventId: "33333333333333333",
  endDateTime: "2026-08-05T17:00:00.000Z",
  eventId: "event-1",
  guildId: "44444444444444444",
  location: "Pegasus Ballroom",
  name: "Lunch",
  roleId: "22222222222222222",
  startDateTime: "2026-08-05T16:00:00.000Z",
  tag: "Food",
};

describe("hackathon event reminders", () => {
  it("mentions only the configured hacker role in the configured channel", () => {
    const body = buildHackReminderMessage(DELIVERY);

    expect(body.allowed_mentions).toEqual({
      parse: [],
      roles: [DELIVERY.roleId],
    });
    expect(body.content).toContain(`<@&${DELIVERY.roleId}>`);
    expect(JSON.stringify(body)).not.toContain("@everyone");
    expect(body.embeds?.[0]?.url).toContain(DELIVERY.discordEventId);
  });

  it("records success only after the Discord message returns", async () => {
    const complete = vi.fn(() => Promise.resolve());
    const fail = vi.fn(() => Promise.resolve());
    const send = vi.fn(() => Promise.resolve({ id: "message-1" }));
    const getDeliveries = vi
      .fn()
      .mockResolvedValueOnce([DELIVERY])
      .mockResolvedValue([]);
    const execute = createHackReminderExecutor({
      complete,
      fail,
      getDeliveries,
      now: () => new Date("2026-08-05T15:45:00.000Z"),
      send,
    });

    await execute();

    expect(send).toHaveBeenCalledWith(
      DELIVERY.channelId,
      expect.objectContaining({
        allowed_mentions: { parse: [], roles: [DELIVERY.roleId] },
      }),
    );
    expect(complete).toHaveBeenCalledWith(DELIVERY.deliveryId, "message-1");
    expect(fail).not.toHaveBeenCalled();
  });

  it("marks ambiguous provider outcomes unknown instead of retrying", async () => {
    const complete = vi.fn(() => Promise.resolve());
    const fail = vi.fn(() => Promise.resolve());
    const getDeliveries = vi
      .fn()
      .mockResolvedValueOnce([DELIVERY])
      .mockResolvedValue([]);
    const execute = createHackReminderExecutor({
      complete,
      fail,
      getDeliveries,
      now: () => new Date("2026-08-05T15:45:00.000Z"),
      send: () =>
        Promise.reject(
          Object.assign(new Error("upstream timeout"), { status: 503 }),
        ),
    });

    await execute();

    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith({
      code: "discord_503",
      deliveryId: DELIVERY.deliveryId,
      state: "unknown",
    });
  });

  it("distinguishes a definite Discord rejection", () => {
    expect(classifyHackReminderFailure({ status: 403 })).toEqual({
      code: "discord_403",
      state: "error",
    });
  });

  it("claims the next delivery only after recording the current outcome", async () => {
    const order: string[] = [];
    const second = { ...DELIVERY, deliveryId: "delivery-2" };
    const getDeliveries = vi
      .fn(() => {
        order.push("claim");
        return Promise.resolve([] as HackReminderDelivery[]);
      })
      .mockImplementationOnce(() => {
        order.push("claim-1");
        return Promise.resolve([DELIVERY]);
      })
      .mockImplementationOnce(() => {
        order.push("claim-2");
        return Promise.resolve([second]);
      });
    const execute = createHackReminderExecutor({
      complete: (deliveryId) => {
        order.push(`complete-${deliveryId}`);
        return Promise.resolve();
      },
      fail: () => Promise.resolve(),
      getDeliveries,
      now: () => new Date("2026-08-05T15:45:00.000Z"),
      send: (_channelId, body) => {
        order.push(`send-${body.embeds?.[0]?.title}`);
        return Promise.resolve();
      },
    });

    await execute();

    expect(order).toEqual([
      "claim-1",
      "send-Lunch",
      "complete-delivery-1",
      "claim-2",
      "send-Lunch",
      "complete-delivery-2",
      "claim",
    ]);
  });
});
