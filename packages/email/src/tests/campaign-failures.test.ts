import { describe, expect, it, vi } from "vitest";

import type { EmailHttpTransport } from "../provider";
import { parseCampaignFailures } from "../campaign-failures";
import { createEmailProviderGateway } from "../provider";

const name = "forge-send:synthetic";
const start = `manager.go:423: start processing campaign (${name})`;
const finish = `pipe.go:232: campaign (${name}) finished`;
const failure = (id: number, error = "421 4.3.0 Temporary System Problem") =>
  `manager.go:501: error sending message in campaign ${name}: subscriber ${id}: ${error}`;

describe("campaign recipient evidence", () => {
  it("distinguishes explicit refusals from ambiguous network errors", () => {
    expect(
      parseCampaignFailures(
        [
          start,
          failure(1),
          failure(2, "550 5.1.1 Unknown user"),
          failure(3, "read tcp: timeout"),
          finish,
        ],
        name,
      ),
    ).toEqual({
      completeRun: true,
      failures: [
        { subscriberId: 1, smtpCode: 421 },
        { subscriberId: 2, smtpCode: 550 },
        { subscriberId: 3, smtpCode: null },
      ],
    });
  });
  it.each([
    [failure(1), finish],
    [start, failure(1)],
    [start, failure(1), finish, start, finish],
    [start, failure(1), failure(1), finish],
    [finish, start, failure(1)],
  ])("does not trust missing, repeated or reversed runs", (...logs) => {
    expect(parseCampaignFailures(logs, name).completeRun).toBe(false);
  });
  it("ignores another campaign and errors outside the finished run", () => {
    expect(
      parseCampaignFailures(
        [
          failure(9),
          start,
          failure(1).replace(name, `${name}-other`),
          failure(2),
          finish,
          failure(3),
        ],
        name,
      ).failures,
    ).toEqual([{ subscriberId: 2, smtpCode: 421 }]);
  });
  it.each([
    { sent: 252, total: 324, bounces: 0, missing: false, complete: true },
    { sent: 251, total: 324, bounces: 0, missing: false, complete: false },
    { sent: 252, total: 324, bounces: 1, missing: false, complete: false },
    { sent: 252, total: 324, bounces: 0, missing: true, complete: false },
  ])(
    "requires reconciled counters and mapped subscriber IDs: $complete",
    async ({ sent, total, bounces, missing, complete }) => {
      const transport = vi
        .fn<EmailHttpTransport>()
        .mockResolvedValueOnce({
          data: {
            id: 7,
            name,
            status: "finished",
            sent,
            to_send: total,
            bounces,
            started_at: "2026-10-01T21:44:09Z",
          },
        })
        .mockResolvedValueOnce({
          data: [
            start,
            ...Array.from({ length: 72 }, (_, index) => failure(index + 1)),
            finish,
          ],
        })
        .mockResolvedValueOnce({
          data: {
            results: Array.from({ length: missing ? 71 : 72 }, (_, index) => ({
              id: index + 1,
              email: `recipient${index + 1}@example.test`,
              status: "enabled",
            })),
          },
        });
      const gateway = createEmailProviderGateway({
        mode: "production",
        transport,
      });
      const result = await gateway.inspectCampaignFailures(7, "synthetic");
      expect(result.complete).toBe(complete);
      expect(result.failures).toHaveLength(missing ? 71 : 72);
      expect(
        transport.mock.calls.every(([request]) => request.method === "GET"),
      ).toBe(true);
    },
  );
  it("rejects a mismatched campaign identity", async () => {
    const transport = vi.fn<EmailHttpTransport>().mockResolvedValue({
      data: { id: 7, name: "someone-else", sent: 1, to_send: 2 },
    });
    await expect(
      createEmailProviderGateway({
        mode: "production",
        transport,
      }).inspectCampaignFailures(7, "synthetic"),
    ).rejects.toThrow("unsupported response");
  });
});
