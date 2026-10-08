import type { EmailCampaignResult } from "@forge/email";
import type { EmailAudienceDefinition } from "@forge/validators";
import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  Hacker,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  compileSubjectForProvider,
  EmailProviderError,
  getDefaultEmailProviderGateway,
} from "@forge/email";

import { isBladeE2E, nodeEnv } from "../../env";
import {
  isDevelopmentReviewAudienceDefinition,
  normalizeRecipientEmail,
} from "./audience";
import { withEmailRecipientLock } from "./recipient-lock";

export type EmailSendStatus = typeof EmailSend.$inferSelect.status;
type CampaignAudienceScope = "development_review" | undefined;

export function developmentCampaignReviewEnabled() {
  return nodeEnv === "development" && !isBladeE2E;
}

export function campaignAudienceScope(value: unknown): CampaignAudienceScope {
  return developmentCampaignReviewEnabled() &&
    isDevelopmentReviewAudienceDefinition(value)
    ? "development_review"
    : undefined;
}

function developmentReviewOnlyError() {
  return new EmailProviderError(
    "TEST_DELIVERY_ONLY",
    "Development campaign delivery is limited to Team members and explicit role audiences.",
  );
}

function developmentAudienceRoleIds(value: unknown) {
  if (!isDevelopmentReviewAudienceDefinition(value)) return null;
  return (value as EmailAudienceDefinition[])
    .filter(
      (
        definition,
      ): definition is Extract<EmailAudienceDefinition, { kind: "role" }> =>
        definition.kind === "role",
    )
    .map(({ roleId }) => roleId);
}

async function loadCurrentDevelopmentAudienceEmails(
  audienceDefinition: unknown,
) {
  const roleIds = developmentAudienceRoleIds(audienceDefinition);
  if (!roleIds) throw developmentReviewOnlyError();
  const includesTeam = (audienceDefinition as EmailAudienceDefinition[]).some(
    ({ kind }) => kind === "team_members",
  );
  const roleCondition =
    includesTeam && roleIds.length > 0
      ? or(eq(Roles.emailAudienceEnabled, true), inArray(Roles.id, roleIds))
      : includesTeam
        ? eq(Roles.emailAudienceEnabled, true)
        : inArray(Roles.id, roleIds);
  const [rows, hackerRows] = await Promise.all([
    db
      .select({ memberEmail: Member.email, userEmail: User.email })
      .from(Permissions)
      .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
      .innerJoin(User, eq(User.id, Permissions.userId))
      .leftJoin(Member, eq(Member.userId, User.id))
      .where(roleCondition),
    /*
      Their hackathon application address counts too.

      Status mail resolves recipients from `Hacker.email`, which people fill in
      with a personal address and officers correct after a bounce — so it is
      routinely not the address on their member record. Checking only member and
      account emails refused a send to a sitting officer because his application
      listed a different mailbox, which is a real address belonging to a real
      team account and exactly who development mail is meant to reach.
    */
    db
      .select({ hackerEmail: Hacker.email })
      .from(Hacker)
      .innerJoin(Permissions, eq(Permissions.userId, Hacker.userId))
      .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
      .where(roleCondition),
  ]);
  return new Set(
    [
      ...rows.map(({ memberEmail, userEmail }) => memberEmail ?? userEmail),
      ...hackerRows.map(({ hackerEmail }) => hackerEmail),
    ]
      .filter((email): email is string => Boolean(email))
      .map(normalizeRecipientEmail),
  );
}

async function assertCurrentDevelopmentAudienceRecipients(
  audienceDefinition: unknown,
  emails: string[],
) {
  const currentAudienceEmails =
    await loadCurrentDevelopmentAudienceEmails(audienceDefinition);
  if (
    emails.some(
      (email) => !currentAudienceEmails.has(normalizeRecipientEmail(email)),
    )
  ) {
    throw developmentReviewOnlyError();
  }
}

export async function processEmailSend(sendId: string) {
  const now = new Date();
  const [claimed] = await db
    .update(EmailSend)
    .set({
      retryLeaseExpiresAt: new Date(now.getTime() + 5 * 60_000),
      status: "syncing",
    })
    .where(
      and(
        eq(EmailSend.id, sendId),
        or(
          eq(EmailSend.status, "queued"),
          and(
            eq(EmailSend.status, "scheduled"),
            isNotNull(EmailSend.scheduledFor),
            lte(EmailSend.scheduledFor, now),
          ),
        ),
        isNull(EmailSend.listmonkCampaignId),
      ),
    )
    .returning();
  if (!claimed) return null;
  const gateway = getDefaultEmailProviderGateway(withEmailRecipientLock);
  let preparedCampaign: EmailCampaignResult | undefined;
  try {
    let recipients = await db
      .select()
      .from(EmailSendRecipient)
      .where(
        and(
          eq(EmailSendRecipient.sendId, sendId),
          isNull(EmailSendRecipient.exclusionReason),
        ),
      );
    const audienceScope = campaignAudienceScope(claimed.audienceDefinition);
    if (developmentCampaignReviewEnabled()) {
      await assertCurrentDevelopmentAudienceRecipients(
        claimed.audienceDefinition,
        recipients.map(({ normalizedEmail }) => normalizedEmail),
      );
    }
    const providerStates = await gateway.lookupSubscriberStates(
      recipients.map(({ normalizedEmail }) => normalizedEmail),
    );
    const lateSuppressions = providerStates.filter(
      ({ status }) => status !== "enabled",
    );
    if (lateSuppressions.length > 0) {
      for (const status of ["blocklisted", "unsubscribed"] as const) {
        const emails = lateSuppressions
          .filter((recipient) => recipient.status === status)
          .map(({ email }) => email.trim().toLowerCase());
        if (emails.length > 0) {
          await db
            .update(EmailSendRecipient)
            .set({ exclusionReason: `late_${status}` })
            .where(
              and(
                eq(EmailSendRecipient.sendId, sendId),
                inArray(EmailSendRecipient.normalizedEmail, emails),
                isNull(EmailSendRecipient.exclusionReason),
              ),
            );
        }
      }
      const suppressed = new Set(
        lateSuppressions.map(({ email }) => email.trim().toLowerCase()),
      );
      recipients = recipients.filter(
        ({ normalizedEmail }) => !suppressed.has(normalizedEmail),
      );
      await db.transaction(async (tx) => {
        await tx
          .update(EmailSend)
          .set({
            excludedSuppressedCount:
              claimed.excludedSuppressedCount + lateSuppressions.length,
            finalRecipientCount: recipients.length,
          })
          .where(eq(EmailSend.id, sendId));
        await tx.insert(EmailSendEvent).values({
          fromStatus: "syncing",
          metadata: { removedSuppressed: lateSuppressions.length },
          sendId,
          toStatus: "syncing",
          type: "late_suppressions_removed",
        });
      });
    }
    if (recipients.length === 0) {
      await db.transaction(async (tx) => {
        await tx
          .update(EmailSend)
          .set({
            retryLeaseExpiresAt: null,
            safeError: null,
            status: "completed",
            terminalAt: new Date(),
          })
          .where(eq(EmailSend.id, sendId));
        await tx.insert(EmailSendEvent).values({
          fromStatus: "syncing",
          metadata: { recipientCount: 0 },
          sendId,
          toStatus: "completed",
          type: "no_eligible_recipients",
        });
      });
      return { campaignId: null, status: "completed" as const };
    }
    const campaign = await gateway.createCampaign({
      audienceScope,
      html: claimed.compiledHtml ?? "",
      isRetry: claimed.retryAttemptCount > 0,
      recipientData: recipients.map((recipient) => {
        const attributes =
          typeof recipient.attributes === "object" &&
          recipient.attributes !== null &&
          !Array.isArray(recipient.attributes)
            ? (recipient.attributes as Record<string, unknown>)
            : {};
        const recipientAttributes =
          typeof attributes.recipient === "object" &&
          attributes.recipient !== null &&
          !Array.isArray(attributes.recipient)
            ? (attributes.recipient as Record<string, unknown>)
            : {};
        return {
          attributes,
          email: recipient.normalizedEmail,
          name:
            typeof recipientAttributes.name === "string"
              ? recipientAttributes.name
              : "",
        };
      }),
      recipientSnapshot: recipients.map(
        ({ normalizedEmail }) => normalizedEmail,
      ),
      sendId,
      // Compiled here rather than stored compiled, so the Email Portal keeps
      // showing an officer the subject they wrote.
      subject: compileSubjectForProvider(claimed.subject, sendId),
      text: claimed.compiledText,
    });
    preparedCampaign = campaign;
    await db
      .update(EmailSend)
      .set({
        listmonkCampaignId: campaign.campaignId,
        listmonkListId: campaign.listId,
        providerMayHaveStarted: true,
      })
      .where(eq(EmailSend.id, sendId));
    try {
      await gateway.setCampaignStatus(
        campaign.campaignId,
        "running",
        audienceScope,
      );
    } catch {
      await db
        .update(EmailSend)
        .set({
          retryLeaseExpiresAt: null,
          safeError: "Campaign start is being reconciled with the provider.",
          status: "running",
        })
        .where(eq(EmailSend.id, sendId));
      return { campaignId: campaign.campaignId, status: "running" as const };
    }
    const nextStatus: EmailSendStatus = "running";
    await db.transaction(async (tx) => {
      await tx
        .update(EmailSend)
        .set({
          retryAttemptCount: 0,
          retryLeaseExpiresAt: null,
          safeError: null,
          status: nextStatus,
        })
        .where(eq(EmailSend.id, sendId));
      await tx.insert(EmailSendEvent).values({
        fromStatus: "syncing",
        metadata: { recipientCount: recipients.length },
        sendId,
        toStatus: nextStatus,
        type: "provider_handoff",
      });
    });
    await reconcileEmailSend(sendId);
    return { campaignId: campaign.campaignId, status: nextStatus };
  } catch (error) {
    if (preparedCampaign) {
      // Once a campaign exists, every error belongs to reconciliation. Returning
      // it to preparation strands it (or risks sending the audience twice).
      await db
        .update(EmailSend)
        .set({
          listmonkCampaignId: preparedCampaign.campaignId,
          listmonkListId: preparedCampaign.listId,
          providerMayHaveStarted: true,
          nextRetryAt: null,
          retryLeaseExpiresAt: null,
          safeError:
            "Provider delivery needs reconciliation. This campaign will not be resent.",
          status: "running",
          terminalAt: null,
        })
        .where(eq(EmailSend.id, sendId));
      return {
        campaignId: preparedCampaign.campaignId,
        status: "running" as const,
      };
    }
    if (
      error instanceof EmailProviderError &&
      error.code === "TEST_DELIVERY_ONLY"
    ) {
      await db
        .update(EmailSend)
        .set({
          nextRetryAt: null,
          retryLeaseExpiresAt: null,
          safeError: "Audience delivery is disabled in this environment.",
          status: "failed",
          terminalAt: new Date(),
        })
        .where(eq(EmailSend.id, sendId));
      return { campaignId: null, status: "failed" as const };
    }
    const attempt = claimed.retryAttemptCount + 1;
    const terminal = attempt >= 5;
    const nextRetryAt = terminal
      ? null
      : new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000);
    await db.transaction(async (tx) => {
      await tx
        .update(EmailSend)
        .set({
          nextRetryAt,
          retryAttemptCount: attempt,
          retryLeaseExpiresAt: null,
          safeError: "The email provider could not prepare this campaign.",
          status: terminal ? "failed" : "queued",
          terminalAt: terminal ? new Date() : null,
        })
        .where(eq(EmailSend.id, sendId));
      await tx.insert(EmailSendEvent).values({
        fromStatus: "syncing",
        metadata: {
          attempt,
          nextRetryAt: nextRetryAt?.toISOString() ?? null,
        },
        sendId,
        toStatus: terminal ? "failed" : "queued",
        type: "provider_prepare_failed",
      });
    });
    return { campaignId: null, status: terminal ? "failed" : "queued" };
  }
}

export async function reconcileEmailSend(sendId: string) {
  const send = await db.query.EmailSend.findFirst({
    where: eq(EmailSend.id, sendId),
  });
  if (!send?.listmonkCampaignId) return null;
  const audienceScope = campaignAudienceScope(send.audienceDefinition);
  if (developmentCampaignReviewEnabled()) {
    const recipients = await db
      .select({ normalizedEmail: EmailSendRecipient.normalizedEmail })
      .from(EmailSendRecipient)
      .where(
        and(
          eq(EmailSendRecipient.sendId, send.id),
          isNull(EmailSendRecipient.exclusionReason),
        ),
      );
    await assertCurrentDevelopmentAudienceRecipients(
      send.audienceDefinition,
      recipients.map(({ normalizedEmail }) => normalizedEmail),
    );
  }
  const state = await getDefaultEmailProviderGateway().reconcileCampaign(
    send.listmonkCampaignId,
  );
  if (
    state.status === "draft" &&
    ["running", "queued", "syncing"].includes(send.status) &&
    send.providerMayHaveStarted
  ) {
    await getDefaultEmailProviderGateway().setCampaignStatus(
      send.listmonkCampaignId,
      "running",
      audienceScope,
    );
    state.status = "running";
  }
  const expectedCount = Math.max(send.finalRecipientCount, state.totalCount);
  const missingCount = Math.max(0, expectedCount - state.sentCount);
  const finished = state.status === "finished" || state.status === "completed";
  const overcounted = finished && state.sentCount > expectedCount;
  const incomplete = finished && (missingCount > 0 || state.bounceCount > 0);
  const paused = state.status === "paused";
  const status: EmailSendStatus =
    incomplete || overcounted || paused
      ? "failed"
      : state.status === "finished" || state.status === "completed"
        ? "completed"
        : state.status === "running"
          ? "running"
          : state.status === "scheduled"
            ? "scheduled"
            : state.status === "cancelled"
              ? "cancelled"
              : state.status === "failed"
                ? "failed"
                : send.status;
  const safeError = paused
    ? "The provider paused this campaign. Review its delivery errors before resuming it in Listmonk."
    : overcounted
      ? `Provider reported ${state.sentCount} sends; expected ${expectedCount}. Verify the delivery counts and check for duplicates before sending again.`
      : incomplete
        ? `Provider finished with ${state.sentCount} of ${expectedCount} messages sent and ${state.bounceCount} reported bounces. Investigate the missing recipients before sending again.`
        : state.status === "failed"
          ? "The provider reported a delivery failure. Review the campaign before sending again."
          : null;
  const terminal =
    finished || state.status === "cancelled" || state.status === "failed";
  const [updated] = await db
    .update(EmailSend)
    .set({
      providerBounceCount: state.bounceCount,
      providerSentCount: state.sentCount,
      nextRetryAt: null,
      safeError,
      status,
      terminalAt: terminal ? (send.terminalAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(EmailSend.id, sendId))
    .returning();
  return updated;
}

export async function runEmailDeliveryCycle() {
  const now = new Date();
  await Promise.all([
    db
      .update(EmailSend)
      .set({
        nextRetryAt: now,
        retryAttemptCount: sql`${EmailSend.retryAttemptCount} + 1`,
        retryLeaseExpiresAt: null,
        safeError: "An interrupted provider preparation is being retried.",
        status: "queued",
      })
      .where(
        and(
          eq(EmailSend.status, "syncing"),
          isNull(EmailSend.listmonkCampaignId),
          isNotNull(EmailSend.retryLeaseExpiresAt),
          lte(EmailSend.retryLeaseExpiresAt, now),
        ),
      ),
    db
      .update(EmailSend)
      .set({
        providerMayHaveStarted: true,
        retryLeaseExpiresAt: null,
        safeError: "An interrupted provider handoff is being reconciled.",
        status: "running",
      })
      .where(
        and(
          eq(EmailSend.status, "syncing"),
          isNotNull(EmailSend.listmonkCampaignId),
          isNotNull(EmailSend.retryLeaseExpiresAt),
          lte(EmailSend.retryLeaseExpiresAt, now),
        ),
      ),
  ]);
  const [preparation, reconciliation] = await Promise.all([
    db
      .select({ id: EmailSend.id })
      .from(EmailSend)
      .where(
        and(
          or(
            eq(EmailSend.status, "queued"),
            and(
              eq(EmailSend.status, "scheduled"),
              isNotNull(EmailSend.scheduledFor),
              lte(EmailSend.scheduledFor, now),
            ),
          ),
          isNull(EmailSend.listmonkCampaignId),
          or(isNull(EmailSend.nextRetryAt), lte(EmailSend.nextRetryAt, now)),
        ),
      )
      .limit(25),
    db
      .select({ id: EmailSend.id })
      .from(EmailSend)
      .where(
        and(
          or(
            inArray(EmailSend.status, ["queued", "scheduled", "running"]),
            and(eq(EmailSend.status, "failed"), isNull(EmailSend.terminalAt)),
            and(
              eq(EmailSend.status, "completed"),
              sql`${EmailSend.providerSentCount} <> ${EmailSend.finalRecipientCount}`,
            ),
          ),
          isNotNull(EmailSend.listmonkCampaignId),
        ),
      )
      .orderBy(EmailSend.updatedAt)
      .limit(100),
  ]);
  const prepared = await Promise.allSettled(
    preparation.map(({ id }) => processEmailSend(id)),
  );
  const reconciled = await Promise.allSettled(
    reconciliation.map(({ id }) => reconcileEmailSend(id)),
  );

  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1_000);
  const expiredSends = await db
    .select({ id: EmailSend.id })
    .from(EmailSend)
    .where(
      and(
        inArray(EmailSend.status, ["completed", "cancelled", "failed"]),
        isNotNull(EmailSend.terminalAt),
        lte(EmailSend.terminalAt, cutoff),
      ),
    )
    .limit(500);
  let removedRecipients = 0;
  for (const expired of expiredSends) {
    const recipients = await db
      .select({ normalizedEmail: EmailSendRecipient.normalizedEmail })
      .from(EmailSendRecipient)
      .where(eq(EmailSendRecipient.sendId, expired.id));
    try {
      await getDefaultEmailProviderGateway(
        withEmailRecipientLock,
      ).removeRecipientNamespace(
        expired.id,
        recipients.map(({ normalizedEmail }) => normalizedEmail),
      );
    } catch {
      await db
        .update(EmailSend)
        .set({
          safeError: "Recipient metadata cleanup is pending.",
        })
        .where(eq(EmailSend.id, expired.id));
      continue;
    }
    const deleted = await db
      .delete(EmailSendRecipient)
      .where(eq(EmailSendRecipient.sendId, expired.id))
      .returning({ id: EmailSendRecipient.id });
    removedRecipients += deleted.length;
  }

  const expiredDrafts = await db
    .select({ id: EmailSend.id })
    .from(EmailSend)
    .where(
      and(eq(EmailSend.status, "draft"), lte(EmailSend.previewExpiresAt, now)),
    )
    .limit(500);
  if (expiredDrafts.length > 0) {
    const ids = expiredDrafts.map(({ id }) => id);
    await db
      .delete(EmailSendRecipient)
      .where(inArray(EmailSendRecipient.sendId, ids));
    await db.delete(EmailSend).where(inArray(EmailSend.id, ids));
  }
  return {
    prepared: prepared.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length,
    reconciled: reconciled.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length,
    removedDrafts: expiredDrafts.length,
    removedRecipients,
  };
}
