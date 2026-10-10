import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import { PRINTING } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles, User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  HackathonPortalClient,
  HackerAttendee,
  HackerProfile,
  PrintingConfiguration,
  PrintJob,
} from "@forge/db/schemas/knight-hacks";
import { printJobStatusEmail, sendEmail } from "@forge/email";
import { logger } from "@forge/utils";
import * as discord from "@forge/utils/discord";

import { env } from "../../env";
import { escapeMarkdown } from "../judging/discord-comms";
import { roleHasPermission } from "../roles/management";
import { isActivePrintJobStatus } from "./queue";

export type PrintDeliveryStatus =
  | "delivered"
  | "failed"
  | "not_configured"
  | "skipped";

export interface PrintNotificationDelivery {
  discord: PrintDeliveryStatus;
  email: PrintDeliveryStatus;
}

async function sendDirectMessage(discordUserId: string, content: string) {
  const channel = (await discord.api.post(Routes.userChannels(), {
    body: { recipient_id: discordUserId },
  })) as { id: string };
  await discord.api.post(Routes.channelMessages(channel.id), {
    body: { allowed_mentions: { parse: [] }, content },
  });
}

/** Discord has a 100-entry cap on `allowed_mentions.roles`. */
const MAX_MENTIONED_ROLES = 100;

const STATUS_HEADLINES: Record<PRINTING.PrintJobStatus, string> = {
  cancelled: "Your print request was cancelled.",
  needs_clarification: "We need a quick answer.",
  picked_up: "Enjoy your print.",
  printing: "Your print is on the printer.",
  ready_for_pickup: "Your print is ready.",
  received: "We have your print request.",
};

/** Discord renders `<t:…>` in each reader's own time zone. */
function discordTime(date: Date, style: "f" | "R" | "t") {
  return `<t:${Math.floor(date.getTime() / 1_000)}:${style}>`;
}

function fullName(profile: { firstName: string; lastName: string } | null) {
  return profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "A hacker";
}

/** Discord role IDs of every role that grants `PRINTING_QUEUE` itself. */
async function printingQueueRoleIds() {
  const roles = await db
    .select({
      discordRoleId: Roles.discordRoleId,
      permissions: Roles.permissions,
    })
    .from(Roles);
  return roles
    .filter(
      (role) =>
        role.discordRoleId !== "" &&
        roleHasPermission(role.permissions, "PRINTING_QUEUE"),
    )
    .map((role) => role.discordRoleId)
    .slice(0, MAX_MENTIONED_ROLES);
}

export function newPrintJobNotice(input: {
  name: string;
  queueUrl: string;
  roleIds: readonly string[];
  submittedAt: Date;
}): RESTPostAPIChannelMessageJSONBody {
  const mentions = input.roleIds.map((id) => `<@&${id}>`).join(" ");
  return {
    // Only the queue roles can ping; hacker-written text cannot.
    allowed_mentions: { parse: [], roles: [...input.roleIds] },
    content: [
      mentions,
      `New 3D print job from **${escapeMarkdown(input.name)}**, submitted ${discordTime(input.submittedAt, "f")}.`,
      input.queueUrl,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function printJobStatusMessage(input: {
  estimatedReadyAt: Date | null;
  note: string | null;
  portalUrl: string | null;
  status: PRINTING.PrintJobStatus;
}) {
  return [
    "**Knight Hacks 3D printing**",
    `${STATUS_HEADLINES[input.status]} Your print job is now **${PRINTING.PRINT_JOB_STATUS_LABELS[input.status]}**.`,
    input.note
      ? `Note from the organizers: ${escapeMarkdown(input.note)}`
      : null,
    input.estimatedReadyAt
      ? `Estimated ready: ${discordTime(input.estimatedReadyAt, "t")} (${discordTime(input.estimatedReadyAt, "R")})`
      : null,
    input.portalUrl ? `Track your print: ${input.portalUrl}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Posts the new-job notice in the hackathon's printing channel. Never throws:
 * the job is already committed, and a missing or failing channel must not
 * fail the hacker's submit.
 */
export async function notifyNewPrintJob(
  jobId: string,
): Promise<PrintDeliveryStatus> {
  try {
    const [job] = await db
      .select({
        channelId: PrintingConfiguration.discordChannelId,
        createdAt: PrintJob.createdAt,
        firstName: HackerProfile.firstName,
        lastName: HackerProfile.lastName,
      })
      .from(PrintJob)
      .innerJoin(
        HackerAttendee,
        eq(HackerAttendee.id, PrintJob.hackerAttendeeId),
      )
      .leftJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
      .leftJoin(
        PrintingConfiguration,
        eq(PrintingConfiguration.hackathonId, PrintJob.hackathonId),
      )
      .where(eq(PrintJob.id, jobId))
      .limit(1);
    if (!job?.channelId) return "not_configured";
    await discord.api.post(Routes.channelMessages(job.channelId), {
      body: newPrintJobNotice({
        name: fullName(
          job.firstName === null
            ? null
            : { firstName: job.firstName, lastName: job.lastName ?? "" },
        ),
        queueUrl: `${env.BLADE_URL.replace(/\/$/, "")}/admin/printing`,
        roleIds: await printingQueueRoleIds(),
        submittedAt: job.createdAt,
      }),
    });
    return "delivered";
  } catch (error) {
    logger.warn("Unable to post the new print job notice; continuing:", error);
    return "failed";
  }
}

/**
 * DMs and emails the hacker about a status change. Each channel is tried on
 * its own and never throws, so the committed status change always stands and
 * Blade can tell the organizer which notice failed.
 */
export async function notifyPrintJobStatus(
  jobId: string,
  headline?: string,
): Promise<PrintNotificationDelivery> {
  try {
    return await deliverPrintJobStatus(jobId, headline);
  } catch (error) {
    logger.warn(
      "Unable to prepare print job status notices; continuing:",
      error,
    );
    return { discord: "failed", email: "failed" };
  }
}

async function deliverPrintJobStatus(
  jobId: string,
  headline?: string,
): Promise<PrintNotificationDelivery> {
  const [job] = await db
    .select({
      category: PrintJob.category,
      description: PrintJob.description,
      discordUserId: User.discordUserId,
      email: HackerProfile.email,
      estimatedReadyAt: PrintJob.estimatedReadyAt,
      firstName: HackerProfile.firstName,
      hackathonId: PrintJob.hackathonId,
      hackathonName: Hackathon.displayName,
      portalOrigin: HackathonPortalClient.productionOrigin,
      status: PrintJob.status,
      statusNote: PrintJob.statusNote,
      timezone: Hackathon.timezone,
    })
    .from(PrintJob)
    .innerJoin(Hackathon, eq(Hackathon.id, PrintJob.hackathonId))
    .innerJoin(HackerAttendee, eq(HackerAttendee.id, PrintJob.hackerAttendeeId))
    .leftJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
    .leftJoin(User, eq(User.id, HackerProfile.userId))
    .leftJoin(
      HackathonPortalClient,
      eq(HackathonPortalClient.hackathonId, PrintJob.hackathonId),
    )
    .where(eq(PrintJob.id, jobId))
    .limit(1);
  if (!job) return { discord: "skipped", email: "skipped" };

  const estimatedReadyAt = isActivePrintJobStatus(job.status)
    ? job.estimatedReadyAt
    : null;
  const portalUrl = job.portalOrigin
    ? `${job.portalOrigin}/dashboard/printing`
    : null;

  const sendDiscord = async (): Promise<PrintDeliveryStatus> => {
    if (!job.discordUserId) return "skipped";
    try {
      await sendDirectMessage(
        job.discordUserId,
        printJobStatusMessage({
          estimatedReadyAt,
          note: job.statusNote,
          portalUrl,
          status: job.status,
        }),
      );
      return "delivered";
    } catch (error) {
      // A hacker with DMs closed lands here; the email still goes out.
      logger.warn("Unable to DM print job status; continuing:", error);
      return "failed";
    }
  };

  const sendMail = async (): Promise<PrintDeliveryStatus> => {
    if (!job.email) return "skipped";
    try {
      await sendEmail({
        to: job.email,
        ...printJobStatusEmail({
          hackathonName: job.hackathonName || "Knight Hacks",
          headline: headline ?? STATUS_HEADLINES[job.status],
          categoryLabel: job.category
            ? PRINTING.PRINT_JOB_CATEGORY_LABELS[job.category]
            : "Not categorized yet",
          description: job.description,
          name: job.firstName ?? "there",
          note: job.statusNote,
          portalUrl,
          readyAt: estimatedReadyAt
            ? new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: job.timezone,
                timeZoneName: "short",
              }).format(estimatedReadyAt)
            : null,
          statusLabel: PRINTING.PRINT_JOB_STATUS_LABELS[job.status],
        }),
      });
      return "delivered";
    } catch {
      // `sendEmail` already logged the provider failure.
      return "failed";
    }
  };

  const [discordStatus, emailStatus] = await Promise.all([
    sendDiscord(),
    sendMail(),
  ]);
  return { discord: discordStatus, email: emailStatus };
}
