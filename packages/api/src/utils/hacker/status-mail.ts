import { TRPCError } from "@trpc/server";

import type { HackathonSendingStatus } from "@forge/validators";
import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";
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
  /**
   * Accounts allowed to receive this send, or `null` for no restriction.
   *
   * Resolved before the transaction opens, like every other read here — a
   * pooled read issued while a transaction holds a connection can exhaust the
   * pool and deadlock the process.
   */
  teamUserIds: Set<string> | null;
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
  /** The Blade account behind the application, used for the dev-only gate. */
  userId: string | null;
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
/** How many of a set would be withheld by the development gate. */
export function withheldByDevelopmentGate(
  teamUserIds: Set<string> | null,
  recipients: StatusMailRecipient[],
) {
  if (!teamUserIds) return 0;
  return recipients.filter(
    (recipient) =>
      recipient.userId === null || !teamUserIds.has(recipient.userId),
  ).length;
}

/**
 * Who may actually receive status mail here.
 *
 * `null` in production: everyone the officer selected. In development it is the
 * set of Blade accounts holding a role — the team — and every recipient whose
 * application is not linked to one of them is dropped before the send is
 * written.
 *
 * Matched on **account, not address**. `User.email` is a synthetic
 * `<discordId>@blade.org` placeholder, because Blade authenticates through
 * Discord and never learns a real address — so comparing it against
 * `Hacker.email` matched nobody, and the first live test sent nothing at all
 * while reporting a successful bulk.
 *
 * The status change itself still happens for everyone, so the roster behaves
 * exactly as it will in production and the flow is testable end to end. What
 * does not happen is mail to a few hundred real students from a laptop. This is
 * the same rule the campaign path already applies, which restricts development
 * delivery to team members and explicit role audiences.
 */
async function resolveTeamUserIds(): Promise<Set<string> | null> {
  if (!developmentCampaignReviewEnabled()) return null;
  // The same roles the delivery gate accepts, not merely "holds any role".
  // Allowing a broader set here wrote recipient rows that delivery then refused,
  // failing the whole send rather than narrowing it.
  const rows = await db
    .selectDistinct({ userId: Permissions.userId })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .where(eq(Roles.emailAudienceEnabled, true));
  return new Set(rows.map((row) => row.userId));
}

export async function prepareStatusMail({
  hackathon,
  status,
}: {
  hackathon: StatusMailHackathon;
  status: HackathonSendingStatus;
}): Promise<PreparedStatusMail> {
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

  return {
    content,
    teamUserIds: await resolveTeamUserIds(),
    hackathon,
    hackathonAttributes,
    sendId,
    status,
  };
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
): Promise<string | null> {
  if (recipients.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No applicants to notify.",
    });
  }
  const { content, hackathon, hackathonAttributes, sendId, status } = prepared;

  /*
    Narrowed to the team in development, and to nobody in production.

    Statuses still move for everyone — the roster behaves as it will in
    production — but only addresses belonging to a role-holder are written as
    recipients here, so a laptop cannot mail three hundred real students. The
    audience definition is recorded as `team_members` to match, which is also
    what lets `processEmailSend` accept it: it refuses a hackathon audience
    outside production.
  */
  const deliverable = prepared.teamUserIds
    ? recipients.filter(
        (recipient) =>
          recipient.userId !== null &&
          prepared.teamUserIds?.has(recipient.userId),
      )
    : recipients;
  // Nothing to send is not a failure here; the officer's status change stands
  // and the attendee simply has no send to point at. The caller reports the
  // gap — a bulk that silently mails nobody while announcing success is exactly
  // how the first live test was lost.
  if (deliverable.length === 0) return null;

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
    audienceDefinition: prepared.teamUserIds
      ? [{ kind: "team_members" }]
      : [{ hackathonId: hackathon.id, kind: "hackathon", statuses: [status] }],
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
    finalRecipientCount: deliverable.length,
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
    deliverable.map((recipient) => ({
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
