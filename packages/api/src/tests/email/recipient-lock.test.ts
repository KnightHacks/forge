import { beforeEach, describe, expect, it, vi } from "vitest";

import { withEmailRecipientLock } from "../../utils/email/recipient-lock";

const database = vi.hoisted(() => {
  const execute = vi.fn<(statement: unknown) => Promise<void>>();
  return {
    execute,
    transaction:
      vi.fn<
        (
          operation: (tx: { execute: typeof execute }) => Promise<void>,
        ) => Promise<void>
      >(),
  };
});

vi.mock("@forge/db/client", () => ({ db: database }));

beforeEach(() => {
  vi.resetAllMocks();
  database.execute.mockResolvedValue();
  database.transaction.mockImplementation((operation) => operation(database));
});

describe("recipient lock capacity", () => {
  it("bounds transaction acquisition across callers and drains queued calls in order", async () => {
    let release: () => void = () => {
      throw new Error("Release gate was not initialized");
    };
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started: number[] = [];
    const transactions = Array.from({ length: 12 }, (_, index) =>
      withEmailRecipientLock(`${index}@example.test`, () => {
        started.push(index);
        return released;
      }),
    );
    try {
      expect(database.transaction).toHaveBeenCalledTimes(4);
    } finally {
      release();
      await Promise.all(transactions);
    }
    expect(database.transaction).toHaveBeenCalledTimes(12);
    expect(started).toEqual(Array.from({ length: 12 }, (_, index) => index));
  });

  it.each(["checkout", "advisory lock", "provider", "commit"])(
    "releases capacity after failure during %s so later callers can run",
    async (phase) => {
      const failure = new Error(`Synthetic ${phase} failure`);
      const failed = vi.fn<() => Promise<void>>().mockResolvedValue();
      for (let index = 0; index < 4; index += 1) {
        if (phase === "checkout") {
          database.transaction.mockRejectedValueOnce(failure);
        } else if (phase === "advisory lock") {
          database.execute.mockRejectedValueOnce(failure);
        } else if (phase === "provider") {
          failed.mockRejectedValueOnce(failure);
        } else {
          database.transaction.mockImplementationOnce(async (operation) => {
            await operation(database);
            throw failure;
          });
        }
      }

      const succeeded = vi.fn<() => Promise<void>>().mockResolvedValue();
      const results = await Promise.allSettled(
        Array.from({ length: 12 }, (_, index) =>
          withEmailRecipientLock(
            `${phase}-${index}@example.test`,
            index < 4 ? failed : succeeded,
          ),
        ),
      );

      expect(results.slice(0, 4)).toEqual(
        Array.from({ length: 4 }, () => ({
          status: "rejected",
          reason: failure,
        })),
      );
      expect(results.slice(4)).toEqual(
        Array.from({ length: 8 }, () => ({
          status: "fulfilled",
          value: undefined,
        })),
      );
      expect(succeeded).toHaveBeenCalledTimes(8);
    },
  );
});
