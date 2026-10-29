import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../crons/leetcode";

interface WebhookMessage {
  content: string;
  threadId?: string;
  embeds?: {
    title: string;
    url: string;
    author: { name: string };
    fields: { name: string; value: string }[];
  }[];
}

const { post, scheduled, send } = vi.hoisted(() => ({
  post: vi.fn(),
  scheduled: new Map<string, () => Promise<void>>(),
  send: vi.fn<(message: WebhookMessage) => Promise<unknown>>(),
}));

vi.mock("@forge/utils/discord", () => ({ api: { post } }));
vi.mock("../env", () => ({ env: { DISCORD_WEBHOOK_LEETCODE: "leetcode" } }));
vi.mock("discord.js", () => ({
  WebhookClient: class {
    send = send;
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

const daily = {
  data: {
    activeDailyCodingChallengeQuestion: {
      date: "2026-10-29",
      link: "/problems/palindromic-path-queries-in-a-tree/",
      question: {
        questionFrontendId: "3841",
        title: "Palindromic Path Queries in a Tree",
        difficulty: "Hard",
        likes: 80,
        dislikes: 5,
        topicTags: [{ name: "Tree", slug: "tree" }],
      },
    },
  },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();

async function runDaily() {
  const run = scheduled.get("0 12 * * *");
  if (!run) throw new Error("Missing leetcode cron.");
  // Settle into a value first so a rejection is handled while timers advance.
  const done = run().then(
    () => undefined,
    (error: unknown) =>
      error instanceof Error ? error : new Error(String(error)),
  );
  await vi.runAllTimersAsync();
  const error = await done;
  if (error) throw error;
}

describe("LeetCode daily cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    send.mockResolvedValue({ channel_id: "channel", id: "message" });
    post.mockResolvedValue({ id: "thread" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the daily problem from LeetCode GraphQL", async () => {
    fetchMock.mockResolvedValueOnce(json(200, daily));
    await runDaily();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://leetcode.com/graphql");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("User-Agent")).toContain(
      "KnightHacksForgeCron",
    );
    expect(init?.body).toContain("activeDailyCodingChallengeQuestion");

    expect(send).toHaveBeenCalledTimes(2);
    const embed = send.mock.calls[0]?.[0].embeds?.[0];
    expect(embed?.title).toBe("3841. Palindromic Path Queries in a Tree");
    expect(embed?.url).toBe(
      "https://leetcode.com/problems/palindromic-path-queries-in-a-tree/",
    );
    expect(embed?.author.name).toBe("Leetcode Daily for 10/29/2026");
    expect(embed?.fields[3]?.value).toBe(
      "||Tree  -  *https://leetcode.com/tag/tree*||",
    );
    expect(post).toHaveBeenCalledOnce();
    expect(send.mock.calls[1]?.[0].threadId).toBe("thread");
  });

  it("retries a 429 and posts once", async () => {
    fetchMock
      .mockResolvedValueOnce(json(429, {}))
      .mockResolvedValueOnce(json(200, daily));
    await runDaily();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledOnce();
  });

  it("retries a network error", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(json(200, daily));
    await runDaily();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up after three failed attempts without posting", async () => {
    fetchMock.mockResolvedValue(json(503, {}));
    await expect(runDaily()).rejects.toThrow("Leetcode API -> 503");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not retry GraphQL errors", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { errors: [{ message: "Cannot query field" }] }),
    );
    await expect(runDaily()).rejects.toThrow("Leetcode API -> 400");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not retry a missing daily question", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        data: { activeDailyCodingChallengeQuestion: null },
        errors: [{ message: "Daily unavailable" }],
      }),
    );
    await expect(runDaily()).rejects.toThrow(
      "Leetcode API -> no daily question: Daily unavailable",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });
});
