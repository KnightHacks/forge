import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClubReminderCandidate } from "../crons/reminder-logic";

import "../crons/reminder";

const { candidates, post, previewSend, reminderSend, scheduled } = vi.hoisted(
  () => ({
    candidates: vi.fn<() => Promise<ClubReminderCandidate[]>>(),
    post: vi.fn(),
    previewSend: vi.fn(),
    reminderSend: vi.fn(),
    scheduled: new Map<string, () => Promise<void>>(),
  }),
);

vi.mock("@forge/api/utils", () => ({
  selectClubReminderCandidates: candidates,
  claimHackathonEventReminderDeliveries: vi.fn(),
  completeHackathonEventReminderDelivery: vi.fn(),
  failHackathonEventReminderDelivery: vi.fn(),
}));
vi.mock("@forge/utils/discord", () => ({ api: { post } }));
vi.mock("../env", () => ({
  env: {
    DISCORD_WEBHOOK_REMINDERS: "live",
    DISCORD_WEBHOOK_REMINDERS_PRE: "preview",
  },
}));
vi.mock("discord.js", () => ({
  WebhookClient: class {
    send: typeof previewSend;
    constructor({ url }: { url: string }) {
      this.send = url === "preview" ? previewSend : reminderSend;
    }
  },
}));
vi.mock("../structs/CronBuilder", () => ({
  CronBuilder: class {
    addCron(expression: string, executor: () => Promise<void>) {
      scheduled.set(expression, executor);
      return this;
    }
  },
}));

describe("Club reminder destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const event = {
      description: "Bring your laptop.",
      discordId: "111111111111111111",
      endDateTime: "2026-06-29T20:00:00-04:00",
      id: "00000000-0000-4000-8000-000000000901",
      location: "ENG2 102",
      name: "Generic Workshop",
      startDateTime: "2026-06-29T18:00:00-04:00",
      tag: "Workshop",
    };
    candidates.mockResolvedValue([
      event,
      {
        ...event,
        name: "Project Lab",
        announcementChannelId: "990000000000000950",
      },
    ]);
  });
  afterEach(() => vi.useRealTimers());

  it.each(["2026-06-28", "2026-06-29"])(
    "keeps every 08:00 preview in the preview webhook on %s",
    async (date) => {
      vi.setSystemTime(new Date(`${date}T08:00:00-04:00`));
      const run = scheduled.get("0 8 * * *");
      if (!run) throw new Error("Missing preview cron.");
      await run();

      expect(previewSend).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(previewSend.mock.calls)).toContain(
        "Generic Workshop",
      );
      expect(JSON.stringify(previewSend.mock.calls)).toContain("Project Lab");
      expect(reminderSend).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    },
  );

  it.each(["2026-06-28", "2026-06-29"])(
    "routes overrides only during the 11:00 announcement on %s",
    async (date) => {
      vi.setSystemTime(new Date(`${date}T11:00:00-04:00`));
      const run = scheduled.get("0 11 * * *");
      if (!run) throw new Error("Missing announcement cron.");
      await run();

      expect(reminderSend).toHaveBeenCalledOnce();
      expect(JSON.stringify(reminderSend.mock.calls)).toContain(
        "Generic Workshop",
      );
      expect(JSON.stringify(reminderSend.mock.calls)).not.toContain(
        "Project Lab",
      );
      expect(post).toHaveBeenCalledOnce();
      expect(post.mock.calls[0]?.[0]).toBe(
        "/channels/990000000000000950/messages",
      );
      expect(JSON.stringify(post.mock.calls)).toContain("Project Lab");
      expect(previewSend).not.toHaveBeenCalled();
    },
  );
});
