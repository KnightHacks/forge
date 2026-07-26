/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it, vi } from "vitest";

import { resolveEmailDeliveryPolicy } from "../index";
import {
  createEmailProviderGateway,
  DIRECTORS_TEST_RECIPIENT,
} from "../provider";

const content = {
  html: "<p>Hello directors</p>",
  subject: "Portal test",
  text: "Hello directors",
};

describe("email delivery mode boundary", () => {
  it("derives production, development review, and fake policies only from NODE_ENV", () => {
    expect(resolveEmailDeliveryPolicy("production")).toEqual({
      allowDevelopmentCampaigns: false,
      mode: "production",
    });
    expect(resolveEmailDeliveryPolicy("development")).toEqual({
      allowDevelopmentCampaigns: true,
      mode: "test",
    });
    expect(resolveEmailDeliveryPolicy("test")).toEqual({
      allowDevelopmentCampaigns: false,
      mode: "fake",
    });
    expect(resolveEmailDeliveryPolicy("development", true)).toEqual({
      allowDevelopmentCampaigns: false,
      mode: "fake",
    });
    expect(resolveEmailDeliveryPolicy("production", true)).toEqual({
      allowDevelopmentCampaigns: false,
      mode: "production",
    });
  });

  it("TC-030 rejects every disabled mutation before transport", async () => {
    const transport = vi.fn();
    const gateway = createEmailProviderGateway({
      mode: "disabled",
      transport,
    });

    await expect(
      gateway.createCampaign({
        ...content,
        recipientSnapshot: ["person@example.test"],
        sendId: "00000000-0000-4000-8000-000000000030",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_DELIVERY_DISABLED" });
    await expect(gateway.sendTest(content)).rejects.toMatchObject({
      code: "EMAIL_DELIVERY_DISABLED",
    });
    await expect(gateway.reconcileCampaign(123)).rejects.toMatchObject({
      code: "EMAIL_DELIVERY_DISABLED",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("TC-031 uses an in-memory fake without constructing network calls", async () => {
    const transport = vi.fn(() => {
      throw new Error("network must not be reached");
    });
    const gateway = createEmailProviderGateway({ mode: "fake", transport });

    const campaign = await gateway.createCampaign({
      ...content,
      recipientSnapshot: ["ada@example.test", "grace@example.test"],
      sendId: "00000000-0000-4000-8000-000000000031",
    });
    await expect(
      gateway.reconcileCampaign(campaign.campaignId),
    ).resolves.toEqual(expect.objectContaining({ totalCount: 2 }));
    await expect(gateway.sendTest(content)).resolves.toEqual(
      expect.objectContaining({ recipient: DIRECTORS_TEST_RECIPIENT }),
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it("TC-032 permits exactly the dedicated directors test-send operation", async () => {
    const transport = vi.fn((request: { method: string; path: string }) => {
      if (
        request.method === "GET" &&
        request.path.startsWith("/api/templates")
      ) {
        return Promise.resolve({
          data: [
            {
              id: 123,
              name: "Forge raw-content transactional wrapper",
              type: "tx",
            },
          ],
        });
      }
      return Promise.resolve({ data: true });
    });
    const gateway = createEmailProviderGateway({
      fromEmail: "Knight Hacks <hello@knighthacks.org>",
      mode: "test",
      transport,
    });

    await expect(gateway.sendTest(content)).resolves.toEqual(
      expect.objectContaining({ recipient: "directors@knighthacks.org" }),
    );
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          data: { body: "<p>Hello directors</p>" },
          subscriber_email: "directors@knighthacks.org",
          subscriber_mode: "external",
          template_id: 123,
        }),
        method: "POST",
        path: "/api/tx",
      }),
    );
  });

  it.each([
    ["bulk", ["directors@knighthacks.org", "person@example.test"]],
    ["non-directors", ["person@example.test"]],
    ["case trick", ["DIRECTORS@KNIGHTHACKS.ORG"]],
    ["whitespace trick", [" directors@knighthacks.org "]],
  ])(
    "TC-NEG-008 rejects %s bypasses before HTTP",
    async (_name, recipients) => {
      const transport = vi.fn();
      const gateway = createEmailProviderGateway({
        mode: "test",
        transport,
      });

      await expect(
        gateway.createCampaign({
          ...content,
          recipientSnapshot: recipients,
          sendId: "00000000-0000-4000-8000-000000000032",
        }),
      ).rejects.toMatchObject({ code: "TEST_DELIVERY_ONLY" });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("permits only an explicitly scoped team campaign in development review", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 201 } })
      .mockResolvedValueOnce({ data: { id: 202 } })
      .mockResolvedValueOnce({ data: { id: 203 } })
      .mockResolvedValueOnce({ data: true });
    const gateway = createEmailProviderGateway({
      allowDevelopmentCampaigns: true,
      campaignTemplateId: 1,
      mode: "test",
      transport,
    });

    const campaign = await gateway.createCampaign({
      ...content,
      audienceScope: "development_review",
      recipientSnapshot: ["teammate@example.test"],
      sendId: "development-team-review",
    });
    await expect(
      gateway.setCampaignStatus(
        campaign.campaignId,
        "running",
        "development_review",
      ),
    ).resolves.toBeUndefined();
    expect(campaign).toMatchObject({ campaignId: 203, listId: 201 });
    expect(transport).toHaveBeenLastCalledWith({
      body: { status: "running" },
      method: "PUT",
      path: "/api/campaigns/203/status",
    });
  });

  it("rejects an unscoped campaign even when team review is enabled", async () => {
    const transport = vi.fn();
    const gateway = createEmailProviderGateway({
      allowDevelopmentCampaigns: true,
      mode: "test",
      transport,
    });

    await expect(
      gateway.createCampaign({
        ...content,
        recipientSnapshot: ["teammate@example.test"],
        sendId: "missing-team-scope",
      }),
    ).rejects.toMatchObject({ code: "TEST_DELIVERY_ONLY" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("TC-NEG-008 rejects a direct recipient-bearing test request", async () => {
    const transport = vi.fn();
    const gateway = createEmailProviderGateway({
      mode: "test",
      transport,
    });

    await expect(
      gateway.sendTransactional({
        ...content,
        recipients: ["directors@knighthacks.org"],
      }),
    ).rejects.toMatchObject({ code: "TEST_DELIVERY_ONLY" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("TC-NEG-009 requires an explicit delivery mode", () => {
    expect(() =>
      createEmailProviderGateway({
        mode: undefined,
        transport: vi.fn(),
      }),
    ).toThrowError(/delivery mode|explicit|disabled/i);
  });
});
