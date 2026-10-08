import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { db } from "@forge/db/client";
import type * as Schema from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import type { EmailProviderGateway } from "@forge/email";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

const gateway = vi.hoisted(() => ({
  createCampaign: vi.fn<EmailProviderGateway["createCampaign"]>(),
  lookupSubscriberStates:
    vi.fn<EmailProviderGateway["lookupSubscriberStates"]>(),
  reconcileCampaign: vi.fn<EmailProviderGateway["reconcileCampaign"]>(),
  removeRecipientNamespace:
    vi.fn<EmailProviderGateway["removeRecipientNamespace"]>(),
  setCampaignStatus: vi.fn<EmailProviderGateway["setCampaignStatus"]>(),
}));
vi.mock("@forge/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@forge/email")>()),
  getDefaultEmailProviderGateway: () => gateway,
}));
vi.mock("../../env", () => ({ nodeEnv: "production", isBladeE2E: false }));

const ACTOR = "10000000-0000-4000-8000-000000000810";

describe.runIf(canRunDatabaseTests())("email delivery with PostgreSQL", () => {
  let disposable: DisposableDatabase | undefined;
  let client: typeof db;
  let schema: typeof Schema;
  let delivery: typeof import("../../utils/email/delivery");
  let lock: typeof import("../../utils/email/recipient-lock").withEmailRecipientLock;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_email_delivery");
    vi.stubEnv("DATABASE_URL", disposable.url);
    ({ db: client } = await import("@forge/db/client"));
    schema = await import("@forge/db/schemas/knight-hacks");
    const { User } = await import("@forge/db/schemas/auth");
    await client.insert(User).values({
      id: ACTOR,
      name: "Synthetic operator",
      discordUserId: "990000000000000810",
    });
    delivery = await import("../../utils/email/delivery");
    ({ withEmailRecipientLock: lock } =
      await import("../../utils/email/recipient-lock"));
  }, 120_000);

  afterAll(async () => {
    await client.$client.end();
    await disposable?.drop();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await client.delete(schema.EmailSendEvent);
    await client.delete(schema.EmailSendRecipient);
    await client.delete(schema.EmailSend);
    vi.resetAllMocks();
    gateway.createCampaign.mockResolvedValue({
      campaignId: 71,
      listId: 72,
      tag: "synthetic",
    });
    gateway.lookupSubscriberStates.mockResolvedValue([]);
    gateway.setCampaignStatus.mockResolvedValue();
    gateway.removeRecipientNamespace.mockResolvedValue();
    gateway.reconcileCampaign.mockResolvedValue({
      bounceCount: 0,
      sentCount: 1,
      totalCount: 1,
      status: "finished",
    });
  });

  async function seed(
    overrides: Partial<typeof schema.EmailSend.$inferInsert> = {},
  ) {
    const id = randomUUID();
    await client.insert(schema.EmailSend).values({
      id,
      subject: "Synthetic",
      compiledText: "Synthetic",
      compiledHtml: "<p>Synthetic</p>",
      audienceDefinition: [],
      audienceHash: "synthetic",
      contentHash: "synthetic",
      previewVersion: "synthetic",
      previewExpiresAt: new Date(Date.now() + 60_000),
      providerTag: `forge-send:${id}`,
      createdBy: ACTOR,
      finalRecipientCount: 1,
      status: "queued",
      ...overrides,
    });
    await client.insert(schema.EmailSendRecipient).values({
      sendId: id,
      email: "person@example.test",
      normalizedEmail: "person@example.test",
      attributes: { recipient: { name: "Person" } },
      matchReasons: [],
    });
    return id;
  }
  const read = (id: string) =>
    client.query.EmailSend.findFirst({ where: eq(schema.EmailSend.id, id) });

  it("keeps a started campaign reconcilable after a failed status read", async () => {
    const id = await seed();
    gateway.reconcileCampaign.mockRejectedValueOnce(
      new Error("Synthetic timeout"),
    );
    await delivery.processEmailSend(id);
    expect(await read(id)).toMatchObject({
      status: "running",
      listmonkCampaignId: 71,
      providerMayHaveStarted: true,
      nextRetryAt: null,
    });
    await delivery.runEmailDeliveryCycle();
    expect(await read(id)).toMatchObject({
      status: "completed",
      providerSentCount: 1,
      safeError: null,
    });
    expect(gateway.createCampaign).toHaveBeenCalledTimes(1);
  });

  it("recovers legacy queued rows with campaign IDs without creating a campaign", async () => {
    const id = await seed({
      listmonkCampaignId: 71,
      providerMayHaveStarted: true,
    });
    await delivery.runEmailDeliveryCycle();
    expect(await read(id)).toMatchObject({ status: "completed" });
    expect(gateway.createCampaign).not.toHaveBeenCalled();
  });

  it.each([
    { expected: 10, sent: 3, total: 10, bounces: 0 },
    { expected: 1, sent: 0, total: 0, bounces: 0 },
    { expected: 10, sent: 10, total: 10, bounces: 2 },
  ])(
    "surfaces incomplete delivery: $sent/$expected and $bounces bounces",
    async ({ expected, sent, total, bounces }) => {
      const id = await seed({
        status: "running",
        listmonkCampaignId: 71,
        providerMayHaveStarted: true,
        finalRecipientCount: expected,
      });
      gateway.reconcileCampaign.mockResolvedValue({
        status: "finished",
        sentCount: sent,
        totalCount: total,
        bounceCount: bounces,
      });
      await delivery.reconcileEmailSend(id);
      const row = await read(id);
      expect(row).toMatchObject({
        status: "failed",
        providerSentCount: sent,
        providerBounceCount: bounces,
      });
      expect(row?.safeError).toMatch(/Investigate the missing recipients/);
      expect(row?.terminalAt).toBeInstanceOf(Date);
    },
  );

  it("rechecks previously completed rows with missing sends", async () => {
    const terminalAt = new Date("2026-10-01T12:00:00Z");
    const id = await seed({
      status: "completed",
      finalRecipientCount: 10,
      providerSentCount: 3,
      listmonkCampaignId: 71,
      providerMayHaveStarted: true,
      terminalAt,
    });
    gateway.reconcileCampaign.mockResolvedValue({
      status: "finished",
      sentCount: 3,
      totalCount: 10,
      bounceCount: 0,
    });
    await delivery.runEmailDeliveryCycle();
    expect(await read(id)).toMatchObject({ status: "failed", terminalAt });
    await delivery.reconcileEmailSend(id);
    expect((await read(id))?.terminalAt).toEqual(terminalAt);
  });

  it("flags a provider over-count instead of reporting successful delivery", async () => {
    const id = await seed({
      status: "completed",
      finalRecipientCount: 1,
      providerSentCount: 2,
      listmonkCampaignId: 71,
      providerMayHaveStarted: true,
    });
    gateway.reconcileCampaign.mockResolvedValue({
      status: "finished",
      sentCount: 2,
      totalCount: 1,
      bounceCount: 0,
    });
    await delivery.runEmailDeliveryCycle();
    const row = await read(id);
    expect(row).toMatchObject({ status: "failed", providerSentCount: 2 });
    expect(row?.safeError).toContain("Provider reported 2 sends; expected 1.");
  });

  it("shows paused delivery as failed and polls without restarting it", async () => {
    const id = await seed({
      status: "running",
      listmonkCampaignId: 71,
      providerMayHaveStarted: true,
    });
    gateway.reconcileCampaign.mockResolvedValueOnce({
      status: "paused",
      sentCount: 0,
      totalCount: 1,
      bounceCount: 0,
    });
    await delivery.reconcileEmailSend(id);
    const paused = await read(id);
    expect(paused).toMatchObject({
      status: "failed",
      terminalAt: null,
    });
    expect(paused?.safeError).toContain("paused");
    gateway.reconcileCampaign.mockResolvedValueOnce({
      status: "running",
      sentCount: 0,
      totalCount: 1,
      bounceCount: 0,
    });
    await delivery.runEmailDeliveryCycle();
    expect(await read(id)).toMatchObject({
      status: "running",
      safeError: null,
    });
    expect(gateway.setCampaignStatus).not.toHaveBeenCalled();
  });

  it("coordinates normalized subscriber addresses across database connections", async () => {
    let enter: () => void = () => {
      throw new Error("Entry gate was not initialized");
    };
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    let release: () => void = () => {
      throw new Error("Release gate was not initialized");
    };
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held = lock(" PERSON@EXAMPLE.TEST ", async () => {
      enter();
      await released;
    });
    await entered;
    try {
      const result = await disposable?.client.query<{ acquired: boolean }>(
        "select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as acquired",
        ["forge:email-recipient:person@example.test"],
      );
      expect(result?.rows[0]?.acquired).toBe(false);
      const other = vi.fn(() => Promise.resolve());
      await lock("other@example.test", other);
      expect(other).toHaveBeenCalledOnce();
    } finally {
      release();
      await held;
    }
    await expect(
      lock("person@example.test", () =>
        Promise.reject(new Error("Synthetic failure")),
      ),
    ).rejects.toThrow("Synthetic failure");
    const result = await disposable?.client.query<{ acquired: boolean }>(
      "select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as acquired",
      ["forge:email-recipient:person@example.test"],
    );
    expect(result?.rows[0]?.acquired).toBe(true);
  });

  it("leaves database connections available while concurrent recipient writes wait on the provider", async () => {
    let enter: () => void = () => {
      throw new Error("Entry gate was not initialized");
    };
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    let release: () => void = () => {
      throw new Error("Release gate was not initialized");
    };
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let active = 0;
    let peak = 0;
    let completed = 0;

    // Separate batches represent overlapping campaigns and retention cleanup.
    const batches = Array.from({ length: 3 }, (_, batch) =>
      Promise.all(
        Array.from({ length: 20 }, (_, recipient) =>
          lock(`batch-${batch}-${recipient}@example.test`, async () => {
            active += 1;
            peak = Math.max(peak, active);
            if (active === 4) enter();
            try {
              await released;
              completed += 1;
            } finally {
              active -= 1;
            }
          }),
        ),
      ),
    );
    const finished = Promise.all(batches);

    try {
      await entered;
      expect(client.$client.waitingCount).toBe(0);
      expect(client.$client.totalCount - client.$client.idleCount).toBe(4);
      // A query using the same pool completes before any provider call releases.
      const result = await client.$client.query<{ available: number }>(
        "select 1 as available",
      );
      expect(result.rows[0]?.available).toBe(1);
      expect(completed).toBe(0);
    } finally {
      release();
      await finished;
    }
    expect(completed).toBe(60);
    expect(peak).toBe(4);
  });
});
