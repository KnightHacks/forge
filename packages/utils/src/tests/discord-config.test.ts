import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectSpy = vi.fn();

vi.mock("@forge/db/client", () => ({
  db: {
    select: () => ({ from: selectSpy }),
  },
}));

const {
  getDiscordConfigId,
  getKnightHacksGuildId,
  invalidateDiscordConfigCache,
} = await import("../discord-config");

const ROWS = [
  {
    developmentId: "1151877367434850364",
    key: "guild",
    productionId: "486628710443778071",
  },
  {
    developmentId: null,
    key: "alumni_role",
    productionId: "486629512101232661",
  },
  {
    developmentId: "1284582557689843785",
    key: "log_channel",
    productionId: "1324885515412963531",
  },
];

function setNodeEnv(value: "development" | "production") {
  // The module reads NODE_ENV at call time rather than at import, which is what
  // makes this stubbable at all.
  vi.stubEnv("NODE_ENV", value);
}

beforeEach(() => {
  selectSpy.mockReset();
  selectSpy.mockResolvedValue(ROWS);
  invalidateDiscordConfigCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("Discord config read path", () => {
  it("serves the development ID outside production and the production ID inside it", async () => {
    setNodeEnv("development");
    await expect(getKnightHacksGuildId()).resolves.toBe("1151877367434850364");

    invalidateDiscordConfigCache();
    setNodeEnv("production");
    await expect(getKnightHacksGuildId()).resolves.toBe("486628710443778071");
  });

  it("falls back to the production ID when a setting has no development value", async () => {
    // Reproduces `ALUMNI_ROLE = PROD_ALUMNI_ROLE`: the constant had no DEV_
    // counterpart, so development used the production role too.
    setNodeEnv("development");
    await expect(getDiscordConfigId("alumni_role")).resolves.toBe(
      "486629512101232661",
    );
  });

  it("re-reads the environment on every call rather than freezing it at import", async () => {
    setNodeEnv("development");
    await expect(getDiscordConfigId("log_channel")).resolves.toBe(
      "1284582557689843785",
    );

    setNodeEnv("production");
    await expect(getDiscordConfigId("log_channel")).resolves.toBe(
      "1324885515412963531",
    );
    // Environment resolution must not require a fresh query.
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("queries once for a burst of concurrent cold-cache lookups", async () => {
    setNodeEnv("development");
    const results = await Promise.all([
      getKnightHacksGuildId(),
      getKnightHacksGuildId(),
      getDiscordConfigId("alumni_role"),
      getDiscordConfigId("log_channel"),
    ]);

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      "1151877367434850364",
      "1151877367434850364",
      "486629512101232661",
      "1284582557689843785",
    ]);
  });

  it("does not hit the database again inside the cache window", async () => {
    setNodeEnv("development");
    await getKnightHacksGuildId();
    vi.advanceTimersByTime(59_000);
    await getKnightHacksGuildId();

    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("refreshes after the cache expires, picking up an officer's edit", async () => {
    setNodeEnv("development");
    await expect(getKnightHacksGuildId()).resolves.toBe("1151877367434850364");

    selectSpy.mockResolvedValue([
      { developmentId: "999888777666555444", key: "guild", productionId: "1" },
    ]);
    vi.advanceTimersByTime(61_000);

    await expect(getKnightHacksGuildId()).resolves.toBe("999888777666555444");
    expect(selectSpy).toHaveBeenCalledTimes(2);
  });

  it("refreshes immediately after explicit invalidation", async () => {
    setNodeEnv("development");
    await getKnightHacksGuildId();
    invalidateDiscordConfigCache();
    await getKnightHacksGuildId();

    expect(selectSpy).toHaveBeenCalledTimes(2);
  });

  it("throws a diagnosable error instead of returning undefined for a missing row", async () => {
    selectSpy.mockResolvedValue([]);

    await expect(getKnightHacksGuildId()).rejects.toThrow(
      /Discord config "guild" has no row/,
    );
  });

  it("does not cache a failed load", async () => {
    selectSpy.mockRejectedValueOnce(new Error("connection refused"));
    await expect(getKnightHacksGuildId()).rejects.toThrow("connection refused");

    setNodeEnv("development");
    await expect(getKnightHacksGuildId()).resolves.toBe("1151877367434850364");
    expect(selectSpy).toHaveBeenCalledTimes(2);
  });
});
