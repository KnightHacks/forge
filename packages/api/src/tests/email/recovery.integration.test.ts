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

const state = vi.hoisted(() => ({
  inspect: vi.fn<EmailProviderGateway["inspectCampaignFailures"]>(),
  eligible: ["failed@example.test", "other@example.test"],
}));
vi.mock("@forge/email", async (original) => ({
  ...(await original<typeof import("@forge/email")>()),
  getDefaultEmailProviderGateway: () => ({
    inspectCampaignFailures: state.inspect,
  }),
}));
vi.mock("../../utils/email/campaign", () => ({
  loadAudienceCandidates: () =>
    Promise.resolve({ recipients: state.eligible.map((email) => ({ email })) }),
}));
vi.mock("../../utils/audit/service", () => ({
  createAdminAuditEvent: vi.fn(),
}));

const actor = { id: "10000000-0000-4000-8000-000000000811" };
describe.runIf(canRunDatabaseTests())(
  "manual recipient recovery with PostgreSQL",
  () => {
    let disposable: DisposableDatabase;
    let client: typeof db;
    let schema: typeof Schema;
    let recovery: typeof import("../../utils/email/recovery");
    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_email_recovery");
      vi.stubEnv("DATABASE_URL", disposable.url);
      ({ db: client } = await import("@forge/db/client"));
      schema = await import("@forge/db/schemas/knight-hacks");
      const { User } = await import("@forge/db/schemas/auth");
      await client.insert(User).values({
        id: actor.id,
        name: "Synthetic reviewer",
        discordUserId: "recovery-reviewer",
      });
      recovery = await import("../../utils/email/recovery");
    }, 120_000);
    afterAll(async () => {
      await client.$client.end();
      await disposable.drop();
      vi.unstubAllEnvs();
    });
    beforeEach(async () => {
      await client.delete(schema.EmailSendEvent);
      await client.delete(schema.EmailSendRecipient);
      await client.delete(schema.EmailSend);
      state.inspect.mockReset();
      state.eligible = ["failed@example.test", "other@example.test"];
      state.inspect.mockResolvedValue({
        complete: true,
        fingerprint: "finished-run-1",
        failures: [
          { email: "failed@example.test", smtpCode: 421, subscriberId: 11 },
          { email: "other@example.test", smtpCode: 550, subscriberId: 12 },
        ],
      });
    });
    async function seed() {
      const sendId = randomUUID();
      const text = `Hello {{ (index .Subscriber.Attribs "forge" "${sendId}" "recipient" "name") }}`;
      await client.insert(schema.EmailSend).values({
        id: sendId,
        subject: "Original status email",
        compiledText: text,
        compiledHtml: `<p>${text}</p>`,
        audienceDefinition: [{ kind: "current_members" }],
        audienceHash: "test",
        contentHash: "frozen",
        previewVersion: "test",
        previewExpiresAt: new Date(),
        providerTag: `forge-send:${sendId}`,
        createdBy: actor.id,
        status: "failed",
        providerMayHaveStarted: true,
        listmonkCampaignId: 7,
        finalRecipientCount: 3,
        providerSentCount: 1,
      });
      await client.insert(schema.EmailSendRecipient).values(
        ["failed@example.test", "other@example.test", "sent@example.test"].map(
          (email) => ({
            sendId,
            email,
            normalizedEmail: email,
            attributes: { recipient: { name: "Frozen name" } },
          }),
        ),
      );
      return recovery.investigateEmailSend(sendId, actor.id);
    }
    it("reviews outcomes without claiming the other recipient reached their inbox", async () => {
      const review = await seed();
      expect(review.recipients.map((row) => row.status).sort()).toEqual([
        "permanent",
        "retryable",
        "unconfirmed",
      ]);
      const events = await client.select().from(schema.EmailSendEvent);
      expect(JSON.stringify(events[0]?.metadata)).not.toContain(
        "@example.test",
      );
    });
    it("queues exactly one selected retry under concurrent clicks and preserves frozen personalization", async () => {
      const review = await seed();
      const id = review.recipients.find(
        (row) => row.status === "retryable",
      )?.id;
      if (!id) throw new Error("Missing fixture recipient");
      const input = {
        sendId: review.send.id,
        investigationId: review.investigationId,
        recipientIds: [id],
      };
      const results = await Promise.allSettled([
        recovery.retryEmailRecipients(input, actor),
        recovery.retryEmailRecipients(input, actor),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const sends = await client.select().from(schema.EmailSend);
      expect(sends).toHaveLength(2);
      const retry = sends.find((send) => send.id !== review.send.id);
      expect(retry).toMatchObject({
        status: "queued",
        finalRecipientCount: 1,
        providerMayHaveStarted: false,
        subject: "Original status email",
      });
      expect(retry?.compiledHtml).toContain(`"forge" "${retry?.id}"`);
      expect(retry?.compiledHtml).not.toContain(review.send.id);
      const recipients = await client
        .select()
        .from(schema.EmailSendRecipient)
        .where(eq(schema.EmailSendRecipient.sendId, retry?.id ?? ""));
      expect(recipients).toMatchObject([
        {
          normalizedEmail: "failed@example.test",
          attributes: { recipient: { name: "Frozen name" } },
        },
      ]);
      const after = await recovery.investigateEmailSend(
        review.send.id,
        actor.id,
      );
      expect(after.retries).toMatchObject([
        { id: retry?.id, status: "queued", expected: 1 },
      ]);
      expect(after.recipients.find((row) => row.id === id)?.status).toBe(
        "retried",
      );
    });
    it.each(["permanent", "unconfirmed"])(
      "rejects forged selection of %s outcomes",
      async (status) => {
        const review = await seed();
        const id = review.recipients.find((row) => row.status === status)?.id;
        if (!id) throw new Error("Missing fixture recipient");
        await expect(
          recovery.retryEmailRecipients(
            {
              sendId: review.send.id,
              investigationId: review.investigationId,
              recipientIds: [id],
            },
            actor,
          ),
        ).rejects.toThrow("Select only confirmed temporary failures");
        expect(await client.select().from(schema.EmailSend)).toHaveLength(1);
      },
    );
    it.each(["audience", "evidence", "expiry", "retention"])(
      "refuses a stale review after $0 changes",
      async (change) => {
        const review = await seed();
        const id = review.recipients.find(
          (row) => row.status === "retryable",
        )?.id;
        if (!id) throw new Error("Missing fixture recipient");
        if (change === "audience") state.eligible = [];
        if (change === "evidence")
          state.inspect.mockResolvedValue({
            complete: false,
            fingerprint: "different-run",
            failures: [],
          });
        if (change === "expiry")
          await client
            .update(schema.EmailSendEvent)
            .set({ createdAt: new Date(Date.now() - 16 * 60_000) });
        if (change === "retention")
          await client.delete(schema.EmailSendRecipient);
        await expect(
          recovery.retryEmailRecipients(
            {
              sendId: review.send.id,
              investigationId: review.investigationId,
              recipientIds: [id],
            },
            actor,
          ),
        ).rejects.toThrow();
        expect(await client.select().from(schema.EmailSend)).toHaveLength(1);
      },
    );
    it("retains verified evidence when provider logs roll off, but never across different runs", async () => {
      const review = await seed();
      state.inspect.mockResolvedValue({
        complete: false,
        fingerprint: "finished-run-1",
        failures: [],
      });
      expect(
        (await recovery.investigateEmailSend(review.send.id, actor.id))
          .complete,
      ).toBe(true);
      state.inspect.mockResolvedValue({
        complete: false,
        fingerprint: "different-run",
        failures: [],
      });
      expect(
        (await recovery.investigateEmailSend(review.send.id, actor.id))
          .complete,
      ).toBe(false);
    });
  },
);
