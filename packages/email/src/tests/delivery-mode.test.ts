/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it, vi } from "vitest";

import { createEmailProviderGateway, DYLAN_TEST_RECIPIENT } from "../provider";

const content = {
  html: "<p>Hello Dylan</p>",
  subject: "Portal test",
  text: "Hello Dylan",
};

describe("email delivery mode boundary", () => {
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
      expect.objectContaining({ recipient: DYLAN_TEST_RECIPIENT }),
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it("TC-032 permits exactly the dedicated Dylan test-send operation", async () => {
    const transport = vi.fn().mockResolvedValue({
      data: { id: 123, status: "success" },
    });
    const gateway = createEmailProviderGateway({
      mode: "dylan-test",
      transport,
    });

    await expect(gateway.sendTest(content)).resolves.toEqual(
      expect.objectContaining({ recipient: "dylan@knighthacks.org" }),
    );
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          subscriber_email: "dylan@knighthacks.org",
        }),
      }),
    );
  });

  it.each([
    ["bulk", ["dylan@knighthacks.org", "person@example.test"]],
    ["non-Dylan", ["person@example.test"]],
    ["case trick", ["DYLAN@KNIGHTHACKS.ORG"]],
    ["whitespace trick", [" dylan@knighthacks.org "]],
  ])(
    "TC-NEG-008 rejects %s bypasses before HTTP",
    async (_name, recipients) => {
      const transport = vi.fn();
      const gateway = createEmailProviderGateway({
        mode: "dylan-test",
        transport,
      });

      await expect(
        gateway.createCampaign({
          ...content,
          recipientSnapshot: recipients,
          sendId: "00000000-0000-4000-8000-000000000032",
        }),
      ).rejects.toMatchObject({ code: "DYLAN_TEST_ONLY" });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("TC-NEG-008 rejects a direct recipient-bearing test request", async () => {
    const transport = vi.fn();
    const gateway = createEmailProviderGateway({
      mode: "dylan-test",
      transport,
    });

    await expect(
      gateway.sendTransactional({
        ...content,
        recipients: ["dylan@knighthacks.org"],
      }),
    ).rejects.toMatchObject({ code: "DYLAN_TEST_ONLY" });
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
