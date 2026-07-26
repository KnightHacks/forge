import { describe, expect, it, vi } from "vitest";

import { createEmailProviderGateway } from "../provider";

describe("production Listmonk campaign gateway", () => {
  it("TC-033 sends typed list and campaign requests with stable Forge tags", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 91, uuid: "list-uuid" } })
      .mockResolvedValueOnce({ data: { id: 92 } })
      .mockResolvedValueOnce({ data: { id: 93, status: "draft" } });
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport,
    });

    const result = await gateway.createCampaign({
      html: "<p>Hello {{ .Subscriber.Attribs.forge.recipient.name }}</p>",
      recipientSnapshot: ["ada@example.test"],
      sendAt: "2026-08-01T17:00:00.000Z",
      sendId: "00000000-0000-4000-8000-000000000033",
      subject: "A campaign",
      text: "Hello Ada",
    });

    expect(result).toMatchObject({
      campaignId: 93,
      listId: 91,
      tag: "forge-send:00000000-0000-4000-8000-000000000033",
    });
    expect(transport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: expect.objectContaining({
          name: expect.stringContaining(
            "forge-send:00000000-0000-4000-8000-000000000033",
          ),
          type: "private",
        }),
        method: "POST",
        path: "/api/lists",
      }),
    );
    expect(transport).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        body: expect.objectContaining({
          altbody: "Hello Ada",
          body: expect.stringContaining("Subscriber.Attribs"),
          lists: [91],
          send_at: "2026-08-01T17:00:00.000Z",
          subject: "A campaign",
          tags: ["forge-send:00000000-0000-4000-8000-000000000033"],
          type: "regular",
        }),
        method: "POST",
        path: "/api/campaigns",
      }),
    );
  });

  it("TC-027 adopts an existing tagged object after an ambiguous timeout", async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error("request timed out"))
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 101,
              name: "forge-send:00000000-0000-4000-8000-000000000027",
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { id: 102 } })
      .mockResolvedValueOnce({ data: { id: 103, status: "draft" } });
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport,
    });

    await expect(
      gateway.createCampaign({
        html: "<p>Hi</p>",
        recipientSnapshot: ["ada@example.test"],
        sendId: "00000000-0000-4000-8000-000000000027",
        subject: "Adopt me",
        text: "Hi",
      }),
    ).resolves.toMatchObject({ listId: 101 });
    expect(
      transport.mock.calls.filter(
        ([request]) =>
          request.method === "POST" && request.path === "/api/lists",
      ),
    ).toHaveLength(1);
  });

  it.each([
    ["malformed JSON", { data: "not-an-object" }],
    ["missing identifier", { data: { status: "draft" } }],
  ])(
    "TC-NEG-011 converts %s to a safe provider failure",
    async (_name, reply) => {
      const transport = vi.fn().mockResolvedValue(reply);
      const gateway = createEmailProviderGateway({
        mode: "production",
        transport,
      });

      await expect(
        gateway.createCampaign({
          html: "<p>Hi ada@example.test</p>",
          recipientSnapshot: ["ada@example.test"],
          sendId: "00000000-0000-4000-8000-000000000111",
          subject: "secret-token-123",
          text: "Hi ada@example.test",
        }),
      ).rejects.toMatchObject({
        code: "EMAIL_PROVIDER_INVALID_RESPONSE",
        message: expect.not.stringMatching(
          /ada@example\.test|secret-token-123/i,
        ),
      });
    },
  );
});
