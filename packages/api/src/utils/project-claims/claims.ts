import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { and, asc, eq, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  HackathonJudgingConfiguration,
  HackerProfile,
  Project,
  ProjectClaim,
  ProjectClaimLink,
  ProjectMember,
} from "@forge/db/schemas/knight-hacks";
import { projectClaimEmail, sendEmail } from "@forge/email";

import type { WriteDb } from "../db";
import { loadParticipantApplication } from "../../hacker-portal/data";
import { lockScheduleHackathon } from "../judging-schedule/source";

export async function requireClaimParticipant(
  userId: string,
  hackathonId: string,
  executor: WriteDb = db,
) {
  const application = await loadParticipantApplication(
    userId,
    hackathonId,
    executor,
  );
  if (!application?.checkedInAt || application.status !== "checkedin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Check in to this event before accessing project judging.",
    });
  return application;
}

export async function projectRoster(projectId: string, executor: WriteDb = db) {
  return executor
    .select({
      id: ProjectMember.id,
      name: ProjectMember.name,
      email: ProjectMember.email,
      invitedUserId: ProjectMember.invitedUserId,
      userId: ProjectClaim.userId,
      profileFirstName: HackerProfile.firstName,
      profileLastName: HackerProfile.lastName,
      discordUser: HackerProfile.discordUser,
      discordUserId: User.discordUserId,
    })
    .from(ProjectMember)
    .leftJoin(ProjectClaim, eq(ProjectClaim.memberId, ProjectMember.id))
    .leftJoin(HackerProfile, eq(HackerProfile.userId, ProjectClaim.userId))
    .leftJoin(User, eq(User.id, ProjectClaim.userId))
    .where(eq(ProjectMember.projectId, projectId))
    .orderBy(asc(ProjectMember.displayOrder));
}

export function claimMemberDto(
  member: Awaited<ReturnType<typeof projectRoster>>[number],
  userId: string,
) {
  return {
    id: member.id,
    name: member.profileFirstName
      ? `${member.profileFirstName} ${member.profileLastName ?? ""}`.trim()
      : member.name,
    claimed: !!member.userId,
    available:
      !member.userId &&
      (!member.invitedUserId || member.invitedUserId === userId),
  };
}

export async function ownProjectClaim(
  userId: string,
  hackathonId: string,
  executor: WriteDb = db,
) {
  const [claim] = await executor
    .select()
    .from(ProjectClaim)
    .where(
      and(
        eq(ProjectClaim.userId, userId),
        eq(ProjectClaim.hackathonId, hackathonId),
      ),
    )
    .limit(1);
  return claim;
}

export async function claimLinkRecord(
  token: string,
  hackathonId: string,
  executor: WriteDb = db,
) {
  const [link] = await executor
    .select({
      id: ProjectClaimLink.id,
      memberId: ProjectClaimLink.memberId,
      projectId: Project.id,
      title: Project.title,
      participantCount: Project.participantCount,
      expiresAt: Hackathon.endDate,
      invitedUserId: ProjectMember.invitedUserId,
    })
    .from(ProjectClaimLink)
    .innerJoin(ProjectMember, eq(ProjectMember.id, ProjectClaimLink.memberId))
    .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
    .innerJoin(Hackathon, eq(Hackathon.id, Project.hackathonId))
    .where(
      and(
        eq(ProjectClaimLink.token, token),
        isNull(ProjectClaimLink.consumedAt),
        eq(Project.hackathonId, hackathonId),
        isNull(Project.deletedAt),
      ),
    )
    .limit(1);
  if (!link || link.expiresAt <= new Date())
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This claim link is unavailable, already used, or expired.",
    });
  if (link.participantCount > 4)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This team exceeds the four-person limit. Contact an organizer.",
    });
  return link;
}

export async function previewProjectClaim(
  userId: string,
  hackathonId: string,
  token: string,
) {
  await requireClaimParticipant(userId, hackathonId);
  const link = await claimLinkRecord(token, hackathonId);
  if (link.invitedUserId && link.invitedUserId !== userId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sign in to the hacker account invited to this project.",
    });
  const members = await projectRoster(link.projectId);
  return {
    projectId: link.projectId,
    title: link.title,
    members: members.map((member) => ({
      ...claimMemberDto(member, userId),
      available:
        !member.userId &&
        (link.invitedUserId
          ? member.id === link.memberId
          : !member.invitedUserId),
    })),
  };
}

export async function selectProjectMember(
  userId: string,
  hackathonId: string,
  input: { token: string; memberId: string },
) {
  return db.transaction(async (tx) => {
    await lockScheduleHackathon(tx, hackathonId);
    await requireClaimParticipant(userId, hackathonId, tx);
    const link = await claimLinkRecord(input.token, hackathonId, tx);
    const own = await ownProjectClaim(userId, hackathonId, tx);
    if (own)
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already claimed a project for this event.",
      });
    const roster = await projectRoster(link.projectId, tx);
    const member = roster.find((item) => item.id === input.memberId);
    if (
      roster.length > 4 ||
      !member ||
      member.userId ||
      (member.invitedUserId && member.invitedUserId !== userId) ||
      (link.invitedUserId &&
        (link.invitedUserId !== userId || link.memberId !== member.id))
    )
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This team member is unavailable. Refresh and select yourself.",
      });
    // The same event lock protects import replacement and every claim/invite write.
    await tx.insert(ProjectClaim).values({
      memberId: member.id,
      projectId: link.projectId,
      hackathonId,
      userId,
    });
    await tx
      .update(ProjectClaimLink)
      .set({ token: null, consumedAt: new Date(), consumedByUserId: userId })
      .where(eq(ProjectClaimLink.id, link.id));
    await tx
      .insert(HackathonJudgingConfiguration)
      .values({
        hackathonId,
        projectClaimsStartedAt: new Date(),
        projectInventoryLockedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: HackathonJudgingConfiguration.hackathonId,
        set: {
          projectClaimsStartedAt: sql`COALESCE(${HackathonJudgingConfiguration.projectClaimsStartedAt}, now())`,
          projectInventoryLockedAt: sql`COALESCE(${HackathonJudgingConfiguration.projectInventoryLockedAt}, now())`,
        },
      });
    return { projectId: link.projectId };
  });
}

export async function prepareClaimLink(hackathonId: string, memberId: string) {
  return db.transaction(async (tx) => {
    await lockScheduleHackathon(tx, hackathonId);
    const [member] = await tx
      .select({ id: ProjectMember.id })
      .from(ProjectMember)
      .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
      .where(
        and(
          eq(ProjectMember.id, memberId),
          eq(Project.hackathonId, hackathonId),
          isNull(Project.deletedAt),
        ),
      )
      .limit(1);
    if (!member)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This claim recipient is unavailable.",
      });
    const [link] = await tx
      .insert(ProjectClaimLink)
      .values({ memberId, token: randomBytes(32).toString("hex") })
      .onConflictDoNothing()
      .returning();
    const [existing] = link
      ? [link]
      : await tx
          .select()
          .from(ProjectClaimLink)
          .where(eq(ProjectClaimLink.memberId, memberId))
          .limit(1);
    if (!existing?.token)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This recipient's claim link has already been used.",
      });
    return existing;
  });
}

export async function projectClaimDelivery(
  hackathonId: string,
  memberId: string,
  deliver: boolean,
) {
  const [details] = await db
    .select({
      name: ProjectMember.name,
      email: ProjectMember.email,
      invited: ProjectMember.invitedUserId,
      title: Project.title,
      event: Hackathon.displayName,
      endDate: Hackathon.endDate,
      claimUrl: HackathonJudgingConfiguration.projectClaimUrl,
    })
    .from(ProjectMember)
    .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
    .innerJoin(Hackathon, eq(Hackathon.id, Project.hackathonId))
    .leftJoin(
      HackathonJudgingConfiguration,
      eq(HackathonJudgingConfiguration.hackathonId, Hackathon.id),
    )
    .where(
      and(eq(ProjectMember.id, memberId), eq(Project.hackathonId, hackathonId)),
    )
    .limit(1);
  if (!details?.claimUrl)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Configure this hackathon's claim-page URL first.",
    });
  if (details.endDate <= new Date())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Claim links expire when the event ends.",
    });
  const link = await prepareClaimLink(hackathonId, memberId);
  const url = new URL(details.claimUrl);
  url.searchParams.set("claim", link.token ?? "");
  if (deliver) {
    // Commit the recoverable invitation before delivery. A failed send can be retried unchanged.
    await sendEmail({
      to: details.email,
      ...projectClaimEmail({
        event: details.event,
        project: details.title,
        name: details.name,
        url: url.toString(),
        invited: !!details.invited,
      }),
    });
    await db
      .update(ProjectClaimLink)
      .set({ sentAt: new Date() })
      .where(eq(ProjectClaimLink.id, link.id));
  }
  return { url: url.toString() };
}

export async function inviteProjectMember(
  userId: string,
  hackathonId: string,
  email: string,
) {
  const memberId = await db.transaction(async (tx) => {
    await lockScheduleHackathon(tx, hackathonId);
    await requireClaimParticipant(userId, hackathonId, tx);
    const claim = await ownProjectClaim(userId, hackathonId, tx);
    if (!claim)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Claim your project before inviting teammates.",
      });
    const [project] = await tx
      .select()
      .from(Project)
      .where(and(eq(Project.id, claim.projectId), isNull(Project.deletedAt)))
      .limit(1);
    if (!project)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project unavailable.",
      });
    const recipients = await tx
      .select({
        userId: HackerProfile.userId,
        firstName: HackerProfile.firstName,
        lastName: HackerProfile.lastName,
      })
      .from(HackerProfile)
      .where(sql`lower(${HackerProfile.email}) = ${email.trim().toLowerCase()}`)
      .limit(2);
    const recipient = recipients[0];
    if (recipients.length !== 1 || !recipient)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use the email on your teammate's existing hacker profile.",
      });
    await requireClaimParticipant(recipient.userId, hackathonId, tx);
    if (await ownProjectClaim(recipient.userId, hackathonId, tx))
      throw new TRPCError({
        code: "CONFLICT",
        message: "That hacker has already claimed a project for this event.",
      });
    const roster = await projectRoster(project.id, tx);
    const existing = roster.find(
      (item) => item.invitedUserId === recipient.userId,
    );
    if (existing) return existing.id;
    if (roster.some((item) => item.email.toLowerCase() === email.toLowerCase()))
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This person is already on the imported roster. Use their claim email.",
      });
    if (Math.max(project.participantCount, roster.length) >= 4)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Your team already has four members, including pending invitations.",
      });
    const [member] = await tx
      .insert(ProjectMember)
      .values({
        projectId: project.id,
        name: `${recipient.firstName} ${recipient.lastName}`,
        email: email.trim().toLowerCase(),
        invitedUserId: recipient.userId,
        displayOrder: roster.length
          ? Math.max(
              ...(
                await tx
                  .select({ order: ProjectMember.displayOrder })
                  .from(ProjectMember)
                  .where(eq(ProjectMember.projectId, project.id))
              ).map((row) => row.order),
            ) + 1
          : 0,
      })
      .returning({ id: ProjectMember.id });
    if (!member) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await tx
      .update(Project)
      .set({ participantCount: project.participantCount + 1 })
      .where(eq(Project.id, project.id));
    return member.id;
  });
  try {
    await projectClaimDelivery(hackathonId, memberId, true);
    return { sent: true, message: "Invitation sent. Their place is reserved." };
  } catch {
    return {
      sent: false,
      message:
        "Their place is reserved, but email delivery failed. Invite the same email again to retry or contact an organizer.",
    };
  }
}
