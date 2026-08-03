import { TRPCError } from "@trpc/server";

import type { HackathonSendingStatus } from "@forge/validators";
import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailSend,
  EmailSendRecipient,
  EmailTemplate,
  HackathonStatusEmail,
} from "@forge/db/schemas/knight-hacks";
import { formatHackathonDate } from "@forge/email/fields";

import type { WriteDb } from "../db";
import { materializeContent } from "../email/campaign";
import { developmentCampaignReviewEnabled } from "../email/delivery";

/** Everything read and compiled before the transaction opens. */
export interface PreparedStatusMail {
  content: Awaited<ReturnType<typeof materializeContent>>;
  hackathon: StatusMailHackathon;
  hackathonAttributes: Record<string, string | undefined>;
  sendId: string;
  status: HackathonSendingStatus;
}

/** Everything the mail needs about one applicant, read once by the caller. */
export interface StatusMailRecipient {
  attendeeId: string;
  email: string;
  firstName: string;
  name: string;
  status: HackathonSendingStatus;
}

export interface StatusMailHackathon {
  applicationUrl: string | null;
  confirmationDeadline: Date;
  displayName: string;
  endDate: Date;
  id: string;
  name: string;
  startDate: Date;
}

/**
 * Queue one hackathon status email for a set of applicants.
 *
 * **One send per action, carrying every recipient**, which is what the pipeline
 * already does — `createCampaign` takes a `recipientData` array — so a bulk
 * accept of two hundred produces one Listmonk campaign rather than two hundred.
 *
 * Deliberately not routed through `previewSend`/`confirmSend`. Those select
 * recipients by audience definition, and a status transition mails a specific
 * set of people an officer picked off a table. Reusing `materializeContent`
 * keeps the compiled body and subject identical to the configuration screen's
 * preview, which is the part that actually has to match.
 *
 * The row is written straight to `queued`, skipping `draft`: the officer's
 * confirmation already happened on our side, and a draft left behind by a
 * transition would be garbage-collected as an expired preview.
 *
 * Runs inside the caller's transaction so the status change and the enqueue
 * commit together — the invariant that replaced the original AC-009 when the
 * pipeline turned out to be asynchronous.
 */
/**
 * Refuses status mail in a development environment.
 *
 * `processEmailSend` rejects a hackathon audience there and marks the send
 * `failed`, so without this an officer accepts two hundred people, sees
 * success, and two minutes later the roster shows all two hundred as
 * delivery-failed. Exported so the *preview* can run the same check — a preview
 * that promises to send and is then refused has failed at its only job.
 */
export function assertStatusMailDeliverable() {
  if (developmentCampaignReviewEnabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Status email delivery is disabled in this environment, so status changes are blocked here.",
    });
  }
}

export async function prepareStatusMail({
  hackathon,
  status,
}: {
  hackathon: StatusMailHackathon;
  status: HackathonSendingStatus;
}): Promise<PreparedStatusMail> {
  assertStatusMailDeliverable();

  const [configured] = await db
    .select({
      subject: HackathonStatusEmail.subject,
      templateId: HackathonStatusEmail.templateId,
      templateArchivedAt: EmailTemplate.archivedAt,
      templateDomain: EmailTemplate.domain,
    })
    .from(HackathonStatusEmail)
    .innerJoin(
      EmailTemplate,
      eq(EmailTemplate.id, HackathonStatusEmail.templateId),
    )
    .where(
      and(
        eq(HackathonStatusEmail.hackathonId, hackathon.id),
        eq(HackathonStatusEmail.status, status),
      ),
    )
    .limit(1);

  // Named, not generic. An officer told "this hackathon is not configured" when
  // five of six statuses are set has to open the config screen and compare.
  if (!configured) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `No email is configured for "${status}". Set one on the hackathon before moving anyone to it.`,
    });
  }
  if (configured.templateArchivedAt) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The template configured for "${status}" is archived. Restore it or pick another.`,
    });
  }
  if (configured.templateDomain !== "hackathon") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The template configured for "${status}" is no longer a hackathon template.`,
    });
  }

  const publishedRevisionId = await resolvePublishedRevision(
    configured.templateId,
    status,
  );

  const sendId = crypto.randomUUID();
  const content = await materializeContent(
    {
      // Empty because every value is supplied per recipient below; the
      // fallback exists for campaigns whose audience lacks a field.
      fallbackData: {},
      mode: "template",
      subject: configured.subject,
      templateRevisionId: publishedRevisionId,
    },
    sendId,
  );

  // Dates are pre-formatted with the same helper the preview sample uses, so an
  // officer who approved "Oct 3, 2026" is approving what actually goes out.
  const hackathonAttributes = {
    applicationUrl: hackathon.applicationUrl ?? undefined,
    confirmationDeadline: formatHackathonDate(hackathon.confirmationDeadline),
    displayName: hackathon.displayName,
    endDate: formatHackathonDate(hackathon.endDate),
    name: hackathon.name,
    startDate: formatHackathonDate(hackathon.startDate),
  };

  return { content, hackathon, hackathonAttributes, sendId, status };
}

/**
 * Writes the prepared send inside the caller's transaction.
 *
 * Only inserts — every read happened in `prepareStatusMail`, before the
 * transaction opened. That split is not cosmetic: a pooled read issued while a
 * transaction holds a connection can exhaust the pool and deadlock the whole
 * process, since `pg-pool` here has `max: 10` and no connection timeout. Ten
 * concurrent status changes would each hold one connection and wait forever for
 * another. `previewSend` orders itself the same way for the same reason.
 */
export async function writeStatusMail(
  tx: WriteDb,
  prepared: PreparedStatusMail,
  actorId: string,
  recipients: StatusMailRecipient[],
): Promise<string> {
  if (recipients.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No applicants to notify.",
    });
  }
  const { content, hackathon, hackathonAttributes, sendId, status } = prepared;

  /*
    Addresses are unique by the time they arrive here — the caller reports a
    second attendee sharing one as `duplicate_email` and does not move them.

    There used to be a dedupe at this point, kept afterwards as defence in
    depth. It was the opposite: the caller updates `status` and
    `lastStatusSendId` for everyone it hands over, so a silent collapse here
    marked someone accepted, never mailed them, and left them invisible in the
    Delivery pane because the send they pointed at had succeeded. A silent
    collapser sitting behind the only thing that prevents collapse is how this
    shipped broken the first time.
  */
  await tx.insert(EmailSend).values({
    audienceDefinition: [
      { hackathonId: hackathon.id, kind: "hackathon", statuses: [status] },
    ],
    audienceHash: sendId,
    compiledHtml: content.compiledHtml,
    compiledText: content.compiledText,
    contentHash: sendId,
    createdBy: actorId,
    duplicateCount: 0,
    excludedInvalidCount: 0,
    excludedManualCount: 0,
    excludedMissingFieldCount: 0,
    excludedSuppressedCount: 0,
    finalRecipientCount: recipients.length,
    id: sendId,
    plainTextSource: content.plainTextSource,
    // Required by the column, and meaningless here: the preview window exists
    // so an unconfirmed campaign draft expires and is garbage-collected. This
    // row is already `queued`, so nothing ever reads it. Set to creation time
    // rather than a future date so it cannot be mistaken for a live preview.
    previewExpiresAt: new Date(),
    previewVersion: sendId,
    providerTag: `forge-send:${sendId}`,
    rawMatchCount: recipients.length,
    // Straight to queued: the officer already confirmed on the roster.
    status: "queued",
    subject: content.subject,
    templateRevisionId: content.templateRevisionId,
  });

  await tx.insert(EmailSendRecipient).values(
    recipients.map((recipient) => ({
      attributes: {
        hacker: { status },
        hackathon: hackathonAttributes,
        recipient: {
          email: recipient.email,
          firstName: recipient.firstName,
          name: recipient.name,
        },
      },
      // Normalized on both fields, matching what the campaign path writes, so
      // `{{recipient.email}}` renders identically from either path.
      email: recipient.email.trim().toLowerCase(),
      matchReasons: [`hackathon:${hackathon.id}:${status}`],
      normalizedEmail: recipient.email.trim().toLowerCase(),
      sendId,
    })),
  );

  return sendId;
}

/**
 * The published revision is what sends, not the latest.
 *
 * A template with unpublished edits would otherwise mail a draft an officer
 * never approved — and the configuration screen's preview renders the published
 * one, so anything else breaks the equivalence that screen promises.
 */
async function resolvePublishedRevision(
  templateId: string,
  status: HackathonSendingStatus,
): Promise<string> {
  const revision = await db.query.EmailTemplateRevision.findFirst({
    columns: { id: true },
    orderBy: (row, { desc }) => [desc(row.version)],
    where: (row, { and: andWhere, eq: eqWhere }) =>
      andWhere(
        eqWhere(row.templateId, templateId),
        eqWhere(row.state, "published"),
      ),
  });
  if (!revision) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The template configured for "${status}" has no published version. Publish it before moving anyone to that status.`,
    });
  }
  return revision.id;
}
