import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { EmailHttpTransport, EmailRecipientLock } from "../provider";
import { createEmailProviderGateway } from "../provider";

const attributes = z.record(z.string(), z.unknown());
const updateSchema = z.object({
  attribs: attributes,
  email: z.string(),
  lists: z.array(z.number()),
  name: z.string(),
  status: z.string(),
});

function fixture() {
  let subscriber = {
    attribs: { forge: { old: { recipient: { name: "Old" } } } } as Record<
      string,
      unknown
    >,
    email: "person@example.test",
    id: 7,
    lists: [{ id: 5, subscription_status: "confirmed" }],
    name: "Person",
    status: "enabled",
  };
  let nextId = 100;
  const transport: EmailHttpTransport = async ({ body, method, path }) => {
    if (path === "/api/lists" || path === "/api/campaigns") {
      return { data: { id: ++nextId } };
    }
    if (path === "/api/subscribers" && method === "POST") {
      throw new Error("Subscriber already exists");
    }
    if (path.startsWith("/api/subscribers?")) {
      return { data: { results: [structuredClone(subscriber)] } };
    }
    if (path === "/api/subscribers/7") {
      const update = updateSchema.parse(body);
      await Promise.resolve();
      subscriber = {
        ...subscriber,
        ...update,
        lists: update.lists.map((id) => ({
          id,
          subscription_status: "confirmed",
        })),
      };
      return { data: structuredClone(subscriber) };
    }
    if (path === "/api/subscribers/lists") {
      const { target_list_ids } = z
        .object({ target_list_ids: z.array(z.number()) })
        .parse(body);
      for (const id of target_list_ids) {
        if (!subscriber.lists.some((list) => list.id === id)) {
          subscriber.lists.push({ id, subscription_status: "confirmed" });
        }
      }
      return { data: true };
    }
    throw new Error(`Unexpected test request: ${path}`);
  };
  // Models a shared coordinator; the API integration test verifies PostgreSQL.
  const pending = new Map<string, Promise<void>>();
  const withRecipientLock: EmailRecipientLock = (email, operation) => {
    const key = email.trim().toLowerCase();
    const next = (pending.get(key) ?? Promise.resolve()).then(operation);
    pending.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  };
  const gateway = () =>
    createEmailProviderGateway({
      campaignTemplateId: 1,
      mode: "production",
      transport,
      withRecipientLock,
    });
  return { gateway, subscriber: () => subscriber };
}

const content = (sendId: string) => ({
  html: "<p>Synthetic</p>",
  recipientData: [
    {
      attributes: { recipient: { name: sendId } },
      email: "person@example.test",
      name: sendId,
    },
  ],
  recipientSnapshot: ["person@example.test"],
  sendId,
  subject: "Synthetic",
  text: "Synthetic",
});

describe("shared subscriber writes", () => {
  it("preserves two simultaneous campaigns' data and list memberships", async () => {
    const test = fixture();
    const [a, b] = await Promise.all([
      test.gateway().createCampaign(content("send-a")),
      test.gateway().createCampaign(content("send-b")),
    ]);
    expect(test.subscriber().attribs.forge).toMatchObject({
      old: { recipient: { name: "Old" } },
      "send-a": { recipient: { name: "send-a" } },
      "send-b": { recipient: { name: "send-b" } },
    });
    expect(test.subscriber().lists.map(({ id }) => id)).toEqual(
      expect.arrayContaining([5, a.listId, b.listId]),
    );
  });

  it("cleans only the expired namespace while another campaign prepares", async () => {
    const test = fixture();
    const [campaign] = await Promise.all([
      test.gateway().createCampaign(content("send-a")),
      test.gateway().removeRecipientNamespace("old", ["person@example.test"]),
    ]);
    expect(test.subscriber().attribs.forge).toEqual({
      "send-a": { recipient: { name: "send-a" } },
    });
    expect(test.subscriber().lists.map(({ id }) => id)).toContain(
      campaign.listId,
    );
  });

  it("requires coordination before any campaign or cleanup mutation", async () => {
    const transport = vi.fn<EmailHttpTransport>();
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport,
    });
    await expect(
      gateway.createCampaign(content("unlocked")),
    ).rejects.toMatchObject({ code: "EMAIL_DELIVERY_POLICY_REQUIRED" });
    await expect(
      gateway.removeRecipientNamespace("old", ["person@example.test"]),
    ).rejects.toMatchObject({ code: "EMAIL_DELIVERY_POLICY_REQUIRED" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("reads the actual Listmonk campaign bounce field", async () => {
    const gateway = createEmailProviderGateway({
      mode: "production",
      transport: () =>
        Promise.resolve({
          data: { status: "finished", sent: 10, to_send: 10, bounces: 7 },
        }),
    });
    await expect(gateway.reconcileCampaign(7)).resolves.toEqual({
      bounceCount: 7,
      sentCount: 10,
      status: "finished",
      totalCount: 10,
    });
  });
});
