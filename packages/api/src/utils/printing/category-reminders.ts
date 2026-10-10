import { PRINTING } from "@forge/consts";
import { and, eq, inArray, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonPortalClient,
  HackerAttendee,
  HackerProfile,
  PrintJob,
} from "@forge/db/schemas/knight-hacks";
import { printJobCategoryReminderEmail, sendEmail } from "@forge/email";

/** Preview and one-time send share the same scoped audience query. */
export async function listPrintCategoryReminderRecipients(hackathonId: string) {
  const rows = await db
    .select({
      id: PrintJob.id,
      email: HackerProfile.email,
      firstName: HackerProfile.firstName,
      hackathonName: Hackathon.displayName,
      portalOrigin: HackathonPortalClient.productionOrigin,
    })
    .from(PrintJob)
    .innerJoin(Hackathon, eq(Hackathon.id, PrintJob.hackathonId))
    .innerJoin(HackerAttendee, eq(HackerAttendee.id, PrintJob.hackerAttendeeId))
    .innerJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
    .innerJoin(
      HackathonPortalClient,
      eq(HackathonPortalClient.hackathonId, PrintJob.hackathonId),
    )
    .where(
      and(
        eq(PrintJob.hackathonId, hackathonId),
        isNull(PrintJob.category),
        isNull(PrintJob.categoryReminderAttemptedAt),
        inArray(PrintJob.status, [
          ...PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES,
        ]),
      ),
    );
  const recipients = new Map<
    string,
    {
      email: string;
      firstName: string;
      hackathonName: string;
      portalUrl: string;
      jobIds: string[];
    }
  >();
  for (const row of rows) {
    if (!row.email || !row.portalOrigin) continue;
    const key = row.email.trim().toLowerCase();
    const recipient = recipients.get(key) ?? {
      email: key,
      firstName: row.firstName,
      hackathonName: row.hackathonName,
      portalUrl: `${row.portalOrigin.replace(/\/$/, "")}/dashboard/printing`,
      jobIds: [],
    };
    recipient.jobIds.push(row.id);
    recipients.set(key, recipient);
  }
  return [...recipients.values()];
}

/** At-most-once attempts: provider timeouts stay claimed for manual inspection. */
export async function sendPrintCategoryReminders(hackathonId: string) {
  const recipients = await listPrintCategoryReminderRecipients(hackathonId);
  const totals = { sent: 0, failed: 0, skipped: 0 };
  for (const recipient of recipients) {
    // Render before claiming: a template failure must not consume the attempt.
    const email = printJobCategoryReminderEmail({
      ...recipient,
      name: recipient.firstName,
      jobCount: recipient.jobIds.length,
    });
    const claimed = await db
      .update(PrintJob)
      .set({ categoryReminderAttemptedAt: new Date() })
      .where(
        and(
          eq(PrintJob.hackathonId, hackathonId),
          inArray(PrintJob.id, recipient.jobIds),
          isNull(PrintJob.category),
          isNull(PrintJob.categoryReminderAttemptedAt),
          inArray(PrintJob.status, [
            ...PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES,
          ]),
        ),
      )
      .returning({ id: PrintJob.id });
    if (claimed.length === 0) {
      totals.skipped++;
      continue;
    }
    try {
      await sendEmail({
        ...(claimed.length === recipient.jobIds.length
          ? email
          : printJobCategoryReminderEmail({
              ...recipient,
              name: recipient.firstName,
              jobCount: claimed.length,
            })),
        to: recipient.email,
      });
      await db
        .update(PrintJob)
        .set({ categoryReminderSentAt: new Date() })
        .where(
          inArray(
            PrintJob.id,
            claimed.map((job) => job.id),
          ),
        );
      totals.sent++;
    } catch {
      // Do not resend a timeout: the provider may already have accepted it.
      totals.failed++;
    }
  }
  return totals;
}
