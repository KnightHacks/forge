/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
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
      campaignTemplateId: 7,
      fromEmail: "Knight Hacks <hello@knighthacks.org>",
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
      2,
      expect.objectContaining({
        body: expect.objectContaining({
          email: "ada@example.test",
          lists: [91],
          preconfirm_subscriptions: true,
          status: "enabled",
        }),
        method: "POST",
        path: "/api/subscribers",
      }),
    );
    expect(transport).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        body: expect.objectContaining({
          altbody: "Hello Ada",
          body: expect.stringContaining("Subscriber.Attribs"),
          from_email: "Knight Hacks <hello@knighthacks.org>",
          lists: [91],
          send_at: "2026-08-01T17:00:00.000Z",
          subject: "A campaign",
          tags: ["forge-send:00000000-0000-4000-8000-000000000033"],
          template_id: 7,
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

  it("searches for tagged list and campaign objects before a retry", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({
        data: { results: [{ id: 201, name: "forge-send:retry" }] },
      })
      .mockResolvedValueOnce({ data: { id: 202 } })
      .mockResolvedValueOnce({
        data: { results: [{ id: 203, name: "forge-send:retry" }] },
      });
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport,
    });

    await expect(
      gateway.createCampaign({
        html: "<p>Retry</p>",
        isRetry: true,
        recipientSnapshot: ["ada@example.test"],
        sendId: "retry",
        subject: "Retry",
        text: "Retry",
      }),
    ).resolves.toMatchObject({ campaignId: 203, listId: 201 });
    expect(
      transport.mock.calls.some(
        ([request]) =>
          request.method === "POST" &&
          (request.path === "/api/lists" || request.path === "/api/campaigns"),
      ),
    ).toBe(false);
  });

  it("creates plain-text campaigns with a plain Listmonk body", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 301 } })
      .mockResolvedValueOnce({ data: { id: 302 } })
      .mockResolvedValueOnce({ data: { id: 303 } });
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport,
    });

    await gateway.createCampaign({
      html: "",
      recipientSnapshot: ["ada@example.test"],
      sendId: "plain-campaign",
      subject: "Plain",
      text: "A complete plain-text message.",
    });

    expect(transport).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        body: expect.objectContaining({
          body: "A complete plain-text message.",
          content_type: "plain",
        }),
        method: "POST",
        path: "/api/campaigns",
      }),
    );
    expect(transport.mock.calls[2]?.[0].body).not.toHaveProperty("altbody");
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
