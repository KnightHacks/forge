import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, desc, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
} from "@forge/db/schemas/knight-hacks";
import { getDefaultEmailProviderGateway } from "@forge/email";
import { emailAudienceDefinitionsSchema } from "@forge/validators";

import type { AuditActor } from "../audit/service";
import { createAdminAuditEvent } from "../audit/service";
import { loadAudienceCandidates } from "./campaign";
import { EMAIL_PREVIEW_TTL_MS } from "./lifecycle";
import { hashValue } from "./templates";

const evidenceSchema = z.object({
  complete: z.boolean(),
  fingerprint: z.string(),
  failures: z.array(
    z.object({
      recipientId: z.string().uuid(),
      smtpCode: z.number().nullable(),
    }),
  ),
});
const retrySchema = z.object({
  retrySendId: z.string().uuid(),
  recipientIds: z.array(z.string().uuid()),
});

function conflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

async function readSend(sendId: string) {
  const send = await db.query.EmailSend.findFirst({
    where: eq(EmailSend.id, sendId),
  });
  if (!send)
    throw new TRPCError({ code: "NOT_FOUND", message: "Send not found." });
  return send;
}

async function inspect(send: typeof EmailSend.$inferSelect) {
  if (
    !send.listmonkCampaignId ||
    !send.providerMayHaveStarted ||
    send.status !== "failed"
  ) {
    conflict(
      "Only finished campaigns with delivery problems can be investigated here.",
    );
  }
  const [provider, recipients, events] = await Promise.all([
    getDefaultEmailProviderGateway().inspectCampaignFailures(
      send.listmonkCampaignId,
      send.id,
    ),
    db
      .select()
      .from(EmailSendRecipient)
      .where(eq(EmailSendRecipient.sendId, send.id)),
    db
      .select()
      .from(EmailSendEvent)
      .where(eq(EmailSendEvent.sendId, send.id))
      .orderBy(desc(EmailSendEvent.createdAt), desc(EmailSendEvent.id)),
  ]);
  const mapped = provider.failures.flatMap((failure) => {
    const recipient = recipients.find(
      (row) => row.normalizedEmail === failure.email && !row.exclusionReason,
    );
    return recipient
      ? [{ recipientId: recipient.id, smtpCode: failure.smtpCode }]
      : [];
  });
  let evidence = {
    complete:
      provider.complete &&
      mapped.length === provider.failures.length &&
      recipients.filter((row) => !row.exclusionReason).length ===
        send.finalRecipientCount &&
      send.providerSentCount + mapped.length === send.finalRecipientCount,
    fingerprint: provider.fingerprint,
    failures: mapped,
  };
  // Logs roll off the provider; retain previously verified evidence only while
  // its immutable campaign run and terminal counters still agree.
  if (!evidence.complete) {
    for (const event of events) {
      if (event.type !== "delivery_investigated") continue;
      const cached = evidenceSchema.safeParse(event.metadata);
      if (
        cached.success &&
        cached.data.complete &&
        cached.data.fingerprint === provider.fingerprint
      ) {
        evidence = cached.data;
        break;
      }
    }
  }
  const retried = new Map<string, string>();
  for (const event of events) {
    if (event.type !== "recipient_retry_created") continue;
    const parsed = retrySchema.safeParse(event.metadata);
    if (parsed.success)
      for (const id of parsed.data.recipientIds)
        retried.set(id, parsed.data.retrySendId);
  }
  const definitions = emailAudienceDefinitionsSchema.safeParse(
    send.audienceDefinition,
  );
  const current = definitions.success
    ? await loadAudienceCandidates(definitions.data)
    : null;
  const eligible = new Set(
    current?.recipients.map((recipient) => recipient.email),
  );
  return { evidence, recipients, retried, eligible };
}

export async function investigateEmailSend(sendId: string, actorId: string) {
  const send = await readSend(sendId);
  const inspection = await inspect(send);
  const retryIds = [...new Set(inspection.retried.values())];
  const retries = retryIds.length
    ? await db
        .select({
          id: EmailSend.id,
          status: EmailSend.status,
          createdAt: EmailSend.createdAt,
          sent: EmailSend.providerSentCount,
          expected: EmailSend.finalRecipientCount,
          providerMayHaveStarted: EmailSend.providerMayHaveStarted,
        })
        .from(EmailSend)
        .where(inArray(EmailSend.id, retryIds))
        .orderBy(desc(EmailSend.createdAt))
    : [];
  const [event] = await db
    .insert(EmailSendEvent)
    .values({
      sendId,
      type: "delivery_investigated",
      actorId,
      metadata: inspection.evidence,
    })
    .returning({ id: EmailSendEvent.id, createdAt: EmailSendEvent.createdAt });
  if (!event) throw new Error("Could not record the investigation.");
  return {
    investigationId: event.id,
    checkedAt: event.createdAt,
    complete: inspection.evidence.complete,
    retries,
    send: {
      id: send.id,
      subject: send.subject,
      createdAt: send.createdAt,
      expected: send.finalRecipientCount,
      sent: send.providerSentCount,
      compiledHtml: send.compiledHtml,
      compiledText: send.compiledText,
    },
    recipients: inspection.recipients.map((recipient) => {
      const failure = inspection.evidence.failures.find(
        (item) => item.recipientId === recipient.id,
      );
      const retrySendId = inspection.retried.get(recipient.id) ?? null;
      const code = failure?.smtpCode;
      const status = recipient.exclusionReason
        ? "excluded"
        : retrySendId
          ? "retried"
          : !inspection.evidence.complete
            ? "unknown"
            : !failure
              ? "unconfirmed"
              : !inspection.eligible.has(recipient.normalizedEmail)
                ? "ineligible"
                : code !== null &&
                    code !== undefined &&
                    code >= 400 &&
                    code < 500
                  ? "retryable"
                  : code !== null && code !== undefined && code >= 500
                    ? "permanent"
                    : "unknown";
      return {
        id: recipient.id,
        email: recipient.email,
        status,
        smtpCode: code ?? null,
        retrySendId,
      };
    }),
  };
}

export async function retryEmailRecipients(
  input: {
    sendId: string;
    investigationId: string;
    recipientIds: string[];
  },
  actor: AuditActor,
) {
  const send = await readSend(input.sendId);
  const investigation = await db.query.EmailSendEvent.findFirst({
    where: and(
      eq(EmailSendEvent.id, input.investigationId),
      eq(EmailSendEvent.sendId, send.id),
      eq(EmailSendEvent.type, "delivery_investigated"),
    ),
  });
  const approved = evidenceSchema.safeParse(investigation?.metadata);
  if (
    !approved.success ||
    !approved.data.complete ||
    !investigation ||
    Date.now() - investigation.createdAt.getTime() > EMAIL_PREVIEW_TTL_MS
  ) {
    conflict(
      "This review expired or has incomplete evidence. Investigate again.",
    );
  }
  const fresh = await inspect(send);
  if (
    !fresh.evidence.complete ||
    fresh.evidence.fingerprint !== approved.data.fingerprint
  ) {
    conflict("Delivery evidence changed. Investigate again before retrying.");
  }
  const selected = fresh.recipients.filter((row) =>
    input.recipientIds.includes(row.id),
  );
  if (
    selected.length !== input.recipientIds.length ||
    selected.some((row) => {
      const failure = fresh.evidence.failures.find(
        (item) => item.recipientId === row.id,
      );
      const reviewed = approved.data.failures.find(
        (item) => item.recipientId === row.id,
      );
      return (
        Boolean(row.exclusionReason) ||
        !fresh.eligible.has(row.normalizedEmail) ||
        reviewed?.smtpCode !== failure?.smtpCode ||
        !failure?.smtpCode ||
        failure.smtpCode < 400 ||
        failure.smtpCode >= 500
      );
    })
  )
    conflict(
      "Select only confirmed temporary failures still eligible for this email.",
    );

  const retrySendId = randomUUID();
  const remap = (value: string) =>
    value.replaceAll(
      `(index .Subscriber.Attribs "forge" "${send.id}" `,
      `(index .Subscriber.Attribs "forge" "${retrySendId}" `,
    );
  const compiledHtml = send.compiledHtml ? remap(send.compiledHtml) : null;
  const compiledText = remap(send.compiledText);
  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(EmailSend)
      .where(eq(EmailSend.id, send.id))
      .for("update");
    if (
      locked?.status !== "failed" ||
      locked.contentHash !== send.contentHash ||
      locked.providerSentCount !== send.providerSentCount ||
      locked.listmonkCampaignId !== send.listmonkCampaignId
    ) {
      conflict("The original send changed. Investigate again.");
    }
    const retained = await tx
      .select({ id: EmailSendRecipient.id })
      .from(EmailSendRecipient)
      .where(
        and(
          eq(EmailSendRecipient.sendId, send.id),
          inArray(EmailSendRecipient.id, input.recipientIds),
        ),
      )
      .for("update");
    if (retained.length !== selected.length)
      conflict("Recipient snapshots are no longer retained.");
    const retries = await tx
      .select({ metadata: EmailSendEvent.metadata })
      .from(EmailSendEvent)
      .where(
        and(
          eq(EmailSendEvent.sendId, send.id),
          eq(EmailSendEvent.type, "recipient_retry_created"),
        ),
      );
    if (
      retries.some((row) => {
        const prior = retrySchema.safeParse(row.metadata);
        return (
          prior.success &&
          prior.data.recipientIds.some((id) => input.recipientIds.includes(id))
        );
      })
    )
      conflict(
        "Some selected recipients already have a retry. Review that send instead.",
      );
    await tx.insert(EmailSend).values({
      id: retrySendId,
      subject: send.subject,
      templateRevisionId: send.templateRevisionId,
      compiledHtml,
      compiledText,
      plainTextSource: send.plainTextSource,
      contentHash: hashValue({ compiledHtml, compiledText }),
      audienceDefinition: send.audienceDefinition,
      audienceHash: hashValue(selected.map((row) => row.normalizedEmail)),
      previewVersion: retrySendId,
      previewExpiresAt: new Date(),
      providerTag: `forge-send:${retrySendId}`,
      rawMatchCount: selected.length,
      finalRecipientCount: selected.length,
      status: "queued",
      confirmedAt: new Date(),
      createdBy: actor.id,
    });
    await tx.insert(EmailSendRecipient).values(
      selected.map((row) => ({
        sendId: retrySendId,
        email: row.email,
        normalizedEmail: row.normalizedEmail,
        attributes: row.attributes,
        matchReasons: row.matchReasons,
      })),
    );
    await tx.insert(EmailSendEvent).values([
      {
        sendId: send.id,
        type: "recipient_retry_created",
        actorId: actor.id,
        metadata: {
          retrySendId,
          recipientIds: input.recipientIds,
          investigationId: investigation.id,
        },
      },
      {
        sendId: retrySendId,
        type: "recipient_retry_of",
        actorId: actor.id,
        toStatus: "queued",
        metadata: { originalSendId: send.id, recipientCount: selected.length },
      },
    ]);
    await createAdminAuditEvent(
      {
        actionKey: "email.send.retry_queued",
        actor,
        changes: [{ field: "status", before: "failed", after: "queued" }],
        metadata: { retryAttemptCount: 1 },
        subjects: [
          {
            relation: "primary",
            targetId: retrySendId,
            targetLabel: send.subject,
            targetType: "email_send",
          },
          {
            relation: "secondary",
            targetId: send.id,
            targetLabel: send.subject,
            targetType: "email_send",
          },
        ],
      },
      tx,
    );
  });
  return { sendId: retrySendId, recipientCount: selected.length };
}
