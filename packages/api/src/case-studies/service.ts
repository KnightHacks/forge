import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { CaseStudyAttribution } from "@forge/validators";
import { and, desc, eq, inArray, isNotNull, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  CaseStudy,
  CaseStudyConsentDecision,
  CaseStudyContributor,
  CaseStudyDraft,
  CaseStudyInvitation,
  CaseStudyPublicationEvent,
  CaseStudyReviewDecision,
  CaseStudyRevision,
} from "@forge/db/schemas/case-studies";
import {
  caseStudyAttributionSchema,
  caseStudyContentSchema,
} from "@forge/validators";

const CONSENT_POLICY_VERSION = 1;
const INVITATION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function attributionHash(attribution: CaseStudyAttribution) {
  return digest(JSON.stringify(caseStudyAttributionSchema.parse(attribution)));
}

function transferHash(studyId: string, targetUserId: string) {
  return digest(`case-study-ownership-transfer:v1:${studyId}:${targetUserId}`);
}

function unavailable(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Case study not found." });
}

function conflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

async function lockedStudy(tx: Transaction, studyId: string) {
  const [study] = await tx
    .select()
    .from(CaseStudy)
    .where(eq(CaseStudy.id, studyId))
    .for("update");
  return study ?? unavailable();
}

async function lockedUser(tx: Transaction, userId: string) {
  const [user] = await tx
    .select({ id: User.id })
    .from(User)
    .where(eq(User.id, userId))
    .for("update");
  if (!user) unavailable();
}

async function ownedStudy(tx: Transaction, studyId: string, actorId: string) {
  const study = await lockedStudy(tx, studyId);
  if (study.ownerUserId !== actorId) unavailable();
  if (study.visibility === "withdrawn") conflict("This study is withdrawn.");
  return study;
}

async function canEditStudy(tx: Transaction, studyId: string, actorId: string) {
  const study = await lockedStudy(tx, studyId);
  if (study.visibility === "withdrawn") unavailable();
  if (study.ownerUserId === actorId) return study;
  const [contributor] = await tx
    .select({ canEdit: CaseStudyContributor.canEdit })
    .from(CaseStudyContributor)
    .where(
      and(
        eq(CaseStudyContributor.caseStudyId, studyId),
        eq(CaseStudyContributor.userId, actorId),
      ),
    );
  if (!contributor?.canEdit) unavailable();
  return study;
}

async function suspendIfPublished(
  tx: Transaction,
  study: typeof CaseStudy.$inferSelect,
  actorId: string,
  reasonCode: "consent_revoked" | "ownership_transfer" | "privacy_request",
) {
  if (!study.publishedRevisionId) return;
  await tx
    .update(CaseStudy)
    .set({
      publishedRevisionId: null,
      updatedAt: new Date(),
      visibility: "suspended",
    })
    .where(eq(CaseStudy.id, study.id));
  await tx.insert(CaseStudyPublicationEvent).values({
    action: "suspend",
    actorUserId: actorId,
    reasonCode,
    revisionId: study.publishedRevisionId,
  });
}

export async function createStudy(actorId: string, slug: string) {
  return db.transaction(async (tx) => {
    await lockedUser(tx, actorId);
    const [study] = await tx
      .insert(CaseStudy)
      .values({ ownerUserId: actorId, slug })
      .onConflictDoNothing({ target: CaseStudy.slug })
      .returning({ id: CaseStudy.id, slug: CaseStudy.slug });
    if (!study) conflict("This slug is already in use.");
    await tx.insert(CaseStudyDraft).values({
      caseStudyId: study.id,
      content: {},
      ownerUserId: actorId,
    });
    return study;
  });
}

export async function listMyStudies(actorId: string) {
  const owned = await db
    .select({
      id: CaseStudy.id,
      slug: CaseStudy.slug,
      visibility: CaseStudy.visibility,
      updatedAt: CaseStudy.updatedAt,
      publishedRevisionId: CaseStudy.publishedRevisionId,
    })
    .from(CaseStudy)
    .where(eq(CaseStudy.ownerUserId, actorId));
  const contributing = await db
    .select({
      id: CaseStudy.id,
      slug: CaseStudy.slug,
      visibility: CaseStudy.visibility,
      updatedAt: CaseStudy.updatedAt,
      publishedRevisionId: CaseStudy.publishedRevisionId,
      canEdit: CaseStudyContributor.canEdit,
      display: CaseStudyContributor.display,
    })
    .from(CaseStudyContributor)
    .innerJoin(CaseStudy, eq(CaseStudy.id, CaseStudyContributor.caseStudyId))
    .where(eq(CaseStudyContributor.userId, actorId));
  return { owned, contributing };
}

export async function getMyStudy(actorId: string, studyId: string) {
  return db.transaction(async (tx) => {
    const study = await lockedStudy(tx, studyId);
    const isOwner = study.ownerUserId === actorId;
    const [membership] = await tx
      .select({ canEdit: CaseStudyContributor.canEdit })
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, studyId),
          eq(CaseStudyContributor.userId, actorId),
        ),
      );
    if (!isOwner && !membership?.canEdit) unavailable();
    const [draft] = await tx
      .select({
        content: CaseStudyDraft.content,
        version: CaseStudyDraft.version,
        updatedAt: CaseStudyDraft.updatedAt,
      })
      .from(CaseStudyDraft)
      .where(eq(CaseStudyDraft.caseStudyId, studyId));
    const revisions = await tx
      .select({
        id: CaseStudyRevision.id,
        revisionNo: CaseStudyRevision.revisionNo,
        contentHash: CaseStudyRevision.contentHash,
        submittedAt: CaseStudyRevision.submittedAt,
        redactedAt: CaseStudyRevision.redactedAt,
      })
      .from(CaseStudyRevision)
      .where(eq(CaseStudyRevision.caseStudyId, studyId))
      .orderBy(desc(CaseStudyRevision.revisionNo));
    return {
      id: study.id,
      slug: study.slug,
      visibility: study.visibility,
      isOwner,
      canEdit: isOwner || !!membership?.canEdit,
      draft: draft ?? null,
      revisions,
    };
  });
}

export async function getMyAttribution(actorId: string, studyId: string) {
  return db.transaction(async (tx) => {
    await lockedStudy(tx, studyId);
    const [contributor] = await tx
      .select({
        attribution: CaseStudyContributor.attribution,
        display: CaseStudyContributor.display,
      })
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, studyId),
          eq(CaseStudyContributor.userId, actorId),
        ),
      );
    if (!contributor) unavailable();
    const attribution = caseStudyAttributionSchema.parse(
      contributor.attribution,
    );
    const hash = attributionHash(attribution);
    const [decision] = await tx
      .select({
        action: CaseStudyConsentDecision.action,
        decidedAt: CaseStudyConsentDecision.decidedAt,
      })
      .from(CaseStudyConsentDecision)
      .where(
        and(
          eq(CaseStudyConsentDecision.caseStudyId, studyId),
          eq(CaseStudyConsentDecision.subjectUserId, actorId),
          eq(CaseStudyConsentDecision.attributionHash, hash),
          eq(CaseStudyConsentDecision.policyVersion, CONSENT_POLICY_VERSION),
        ),
      )
      .orderBy(
        desc(CaseStudyConsentDecision.decidedAt),
        desc(CaseStudyConsentDecision.id),
      )
      .limit(1);
    return {
      attribution,
      attributionHash: hash,
      policyVersion: CONSENT_POLICY_VERSION,
      currentDecision: decision ?? null,
      display: contributor.display,
    };
  });
}

export async function listContributors(actorId: string, studyId: string) {
  return db.transaction(async (tx) => {
    await ownedStudy(tx, studyId, actorId);
    return tx
      .select({
        id: CaseStudyContributor.id,
        userId: CaseStudyContributor.userId,
        attribution: CaseStudyContributor.attribution,
        canEdit: CaseStudyContributor.canEdit,
        display: CaseStudyContributor.display,
      })
      .from(CaseStudyContributor)
      .where(eq(CaseStudyContributor.caseStudyId, studyId))
      .orderBy(CaseStudyContributor.createdAt);
  });
}

export async function saveDraft(
  actorId: string,
  input: { caseStudyId: string; expectedVersion: number; content: unknown },
) {
  const content = caseStudyContentSchema.parse(input.content);
  return db.transaction(async (tx) => {
    await canEditStudy(tx, input.caseStudyId, actorId);
    const [draft] = await tx
      .update(CaseStudyDraft)
      .set({
        content,
        updatedAt: new Date(),
        version: sql`${CaseStudyDraft.version} + 1`,
      })
      .where(
        and(
          eq(CaseStudyDraft.caseStudyId, input.caseStudyId),
          eq(CaseStudyDraft.version, input.expectedVersion),
        ),
      )
      .returning({
        version: CaseStudyDraft.version,
        updatedAt: CaseStudyDraft.updatedAt,
      });
    if (!draft) conflict("The draft changed. Reload it before saving.");
    return draft;
  });
}

export async function submitStudy(
  actorId: string,
  input: {
    caseStudyId: string;
    expectedVersion: number;
    authorConnection: "member" | "alumni" | "community" | "other";
    privateEvidenceUrls: string[];
  },
) {
  return db.transaction(async (tx) => {
    await ownedStudy(tx, input.caseStudyId, actorId);
    const [draft] = await tx
      .select()
      .from(CaseStudyDraft)
      .where(eq(CaseStudyDraft.caseStudyId, input.caseStudyId));
    if (!draft) conflict("The draft changed. Reload it before submitting.");
    if (draft.version !== input.expectedVersion)
      conflict("The draft changed. Reload it before submitting.");
    const content = caseStudyContentSchema.parse(draft.content);
    const contributors = await tx
      .select({
        userId: CaseStudyContributor.userId,
        attribution: CaseStudyContributor.attribution,
      })
      .from(CaseStudyContributor)
      .where(eq(CaseStudyContributor.caseStudyId, input.caseStudyId))
      .orderBy(CaseStudyContributor.userId);
    const [lastRevision] = await tx
      .select({ revisionNo: CaseStudyRevision.revisionNo })
      .from(CaseStudyRevision)
      .where(eq(CaseStudyRevision.caseStudyId, input.caseStudyId))
      .orderBy(desc(CaseStudyRevision.revisionNo))
      .limit(1);
    const [revision] = await tx
      .insert(CaseStudyRevision)
      .values({
        caseStudyId: input.caseStudyId,
        revisionNo: (lastRevision?.revisionNo ?? 0) + 1,
        content,
        contentHash: digest(JSON.stringify(content)),
        privateEvidence: input.privateEvidenceUrls,
        authorConnection: input.authorConnection,
        attributionSubjectIds: contributors.map((item) => item.userId),
        attributionHashes: contributors.map((item) =>
          attributionHash(caseStudyAttributionSchema.parse(item.attribution)),
        ),
        submitterUserId: actorId,
      })
      .returning({
        id: CaseStudyRevision.id,
        revisionNo: CaseStudyRevision.revisionNo,
        contentHash: CaseStudyRevision.contentHash,
      });
    if (!revision) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return revision;
  });
}

export async function inviteContributor(
  actorId: string,
  input: {
    caseStudyId: string;
    attribution: CaseStudyAttribution;
    targetUserId?: string;
  },
) {
  const attribution = caseStudyAttributionSchema.parse(input.attribution);
  const hash = attributionHash(attribution);
  const token = randomBytes(32).toString("base64url");
  return db.transaction(async (tx) => {
    const study = await ownedStudy(tx, input.caseStudyId, actorId);
    if (input.targetUserId === actorId)
      conflict("The owner cannot invite their own account as a coauthor.");
    if (input.targetUserId) {
      await tx
        .update(CaseStudyInvitation)
        .set({ status: "revoked", tokenHash: null })
        .where(
          and(
            eq(CaseStudyInvitation.caseStudyId, input.caseStudyId),
            eq(CaseStudyInvitation.targetUserId, input.targetUserId),
            eq(CaseStudyInvitation.status, "pending"),
          ),
        );
      const [target] = await tx
        .select({ id: User.id })
        .from(User)
        .where(eq(User.id, input.targetUserId));
      if (!target) conflict("The target account does not exist.");
      const [existing] = await tx
        .select()
        .from(CaseStudyContributor)
        .where(
          and(
            eq(CaseStudyContributor.caseStudyId, input.caseStudyId),
            eq(CaseStudyContributor.userId, input.targetUserId),
          ),
        );
      if (existing) {
        const changed =
          attributionHash(
            caseStudyAttributionSchema.parse(existing.attribution),
          ) !== hash;
        if (existing.display && changed)
          await suspendIfPublished(tx, study, actorId, "privacy_request");
        await tx
          .update(CaseStudyContributor)
          .set({
            attribution,
            canEdit: changed ? false : existing.canEdit,
            display: changed ? false : existing.display,
            updatedAt: new Date(),
          })
          .where(eq(CaseStudyContributor.id, existing.id));
      } else {
        await tx.insert(CaseStudyContributor).values({
          attribution,
          caseStudyId: input.caseStudyId,
          userId: input.targetUserId,
        });
      }
    }
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS - 60_000);
    const [invitation] = await tx
      .insert(CaseStudyInvitation)
      .values({
        caseStudyId: input.caseStudyId,
        tokenHash: digest(token),
        attributionHash: hash,
        targetUserId: input.targetUserId,
        expiresAt,
      })
      .returning({
        id: CaseStudyInvitation.id,
        expiresAt: CaseStudyInvitation.expiresAt,
      });
    if (!invitation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return { ...invitation, token };
  });
}

export async function listInvitations(actorId: string, studyId: string) {
  return db.transaction(async (tx) => {
    await ownedStudy(tx, studyId, actorId);
    const invitations = await tx
      .select({
        id: CaseStudyInvitation.id,
        status: CaseStudyInvitation.status,
        expiresAt: CaseStudyInvitation.expiresAt,
        targetUserId: CaseStudyInvitation.targetUserId,
        redeemerUserId: CaseStudyInvitation.redeemerUserId,
        confirmingUserId: CaseStudyInvitation.confirmingUserId,
        attributionHash: CaseStudyInvitation.attributionHash,
        redeemerName: User.name,
      })
      .from(CaseStudyInvitation)
      .leftJoin(User, eq(User.id, CaseStudyInvitation.redeemerUserId))
      .where(eq(CaseStudyInvitation.caseStudyId, studyId))
      .orderBy(desc(CaseStudyInvitation.createdAt));
    return invitations.map((invitation) => ({
      ...invitation,
      kind:
        invitation.targetUserId &&
        invitation.attributionHash ===
          transferHash(studyId, invitation.targetUserId)
          ? ("transfer" as const)
          : ("attribution" as const),
    }));
  });
}

export async function revokeInvitation(actorId: string, invitationId: string) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ caseStudyId: CaseStudyInvitation.caseStudyId })
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.id, invitationId));
    if (!candidate) unavailable();
    await ownedStudy(tx, candidate.caseStudyId, actorId);
    const [revoked] = await tx
      .update(CaseStudyInvitation)
      .set({ status: "revoked", tokenHash: null })
      .where(
        and(
          eq(CaseStudyInvitation.id, invitationId),
          eq(CaseStudyInvitation.status, "pending"),
        ),
      )
      .returning({ id: CaseStudyInvitation.id });
    if (!revoked) conflict("This invitation is no longer pending.");
    return { revoked: true };
  });
}

export async function redeemInvitation(actorId: string, token: string) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ caseStudyId: CaseStudyInvitation.caseStudyId })
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.tokenHash, digest(token)));
    if (!candidate) unavailable();
    await lockedStudy(tx, candidate.caseStudyId);
    const [invitation] = await tx
      .select()
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.tokenHash, digest(token)))
      .for("update");
    if (!invitation) unavailable();
    if (invitation.status !== "pending" || invitation.expiresAt <= new Date())
      unavailable();
    if (
      invitation.targetUserId &&
      invitation.attributionHash ===
        transferHash(invitation.caseStudyId, invitation.targetUserId)
    )
      unavailable();
    if (invitation.targetUserId && invitation.targetUserId !== actorId)
      unavailable();
    const [updated] = await tx
      .update(CaseStudyInvitation)
      .set({
        redeemerUserId: actorId,
        status: "consumed",
        tokenHash: null,
        confirmingUserId: invitation.targetUserId ? actorId : null,
      })
      .where(eq(CaseStudyInvitation.id, invitation.id))
      .returning({
        id: CaseStudyInvitation.id,
        caseStudyId: CaseStudyInvitation.caseStudyId,
      });
    return { ...updated, requiresOwnerConfirmation: !invitation.targetUserId };
  });
}

export async function confirmContributor(
  actorId: string,
  invitationId: string,
  rawAttribution: CaseStudyAttribution,
) {
  const attribution = caseStudyAttributionSchema.parse(rawAttribution);
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ caseStudyId: CaseStudyInvitation.caseStudyId })
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.id, invitationId));
    if (!candidate) unavailable();
    await ownedStudy(tx, candidate.caseStudyId, actorId);
    const [invitation] = await tx
      .select()
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.id, invitationId))
      .for("update");
    if (!invitation) unavailable();
    if (
      invitation.status !== "consumed" ||
      invitation.targetUserId ||
      !invitation.redeemerUserId ||
      invitation.confirmingUserId ||
      attributionHash(attribution) !== invitation.attributionHash ||
      invitation.redeemerUserId === actorId
    )
      unavailable();
    const [existing] = await tx
      .select({ id: CaseStudyContributor.id })
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, candidate.caseStudyId),
          eq(CaseStudyContributor.userId, invitation.redeemerUserId),
        ),
      );
    if (existing) conflict("This account is already a contributor.");
    await tx.insert(CaseStudyContributor).values({
      attribution,
      caseStudyId: candidate.caseStudyId,
      userId: invitation.redeemerUserId,
    });
    await tx
      .update(CaseStudyInvitation)
      .set({ confirmingUserId: actorId })
      .where(eq(CaseStudyInvitation.id, invitationId));
    return { confirmed: true };
  });
}

export async function decideConsent(
  actorId: string,
  input: {
    caseStudyId: string;
    attributionHash: string;
    policyVersion: number;
    action: "accept" | "decline" | "revoke";
  },
) {
  if (input.policyVersion !== CONSENT_POLICY_VERSION)
    conflict("Unsupported attribution policy version.");
  return db.transaction(async (tx) => {
    const study = await lockedStudy(tx, input.caseStudyId);
    const [contributor] = await tx
      .select()
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, input.caseStudyId),
          eq(CaseStudyContributor.userId, actorId),
        ),
      );
    if (
      !contributor ||
      attributionHash(
        caseStudyAttributionSchema.parse(contributor.attribution),
      ) !== input.attributionHash
    )
      unavailable();
    const [last] = await tx
      .select({ action: CaseStudyConsentDecision.action })
      .from(CaseStudyConsentDecision)
      .where(
        and(
          eq(CaseStudyConsentDecision.caseStudyId, input.caseStudyId),
          eq(CaseStudyConsentDecision.subjectUserId, actorId),
          eq(CaseStudyConsentDecision.attributionHash, input.attributionHash),
          eq(CaseStudyConsentDecision.policyVersion, input.policyVersion),
        ),
      )
      .orderBy(
        desc(CaseStudyConsentDecision.decidedAt),
        desc(CaseStudyConsentDecision.id),
      )
      .limit(1);
    if (last?.action === input.action)
      conflict("This consent decision is already current.");
    if (input.action === "revoke" && last?.action !== "accept")
      conflict("There is no active consent to revoke.");
    const [proof] = await tx
      .select()
      .from(CaseStudyInvitation)
      .where(
        and(
          eq(CaseStudyInvitation.caseStudyId, input.caseStudyId),
          eq(CaseStudyInvitation.attributionHash, input.attributionHash),
          eq(CaseStudyInvitation.redeemerUserId, actorId),
          eq(CaseStudyInvitation.status, "consumed"),
        ),
      )
      .orderBy(desc(CaseStudyInvitation.createdAt))
      .limit(1);
    if (input.action === "accept") {
      if (!proof?.confirmingUserId) unavailable();
      if (proof.targetUserId && proof.confirmingUserId !== actorId)
        unavailable();
    }
    await tx.insert(CaseStudyConsentDecision).values({
      caseStudyId: input.caseStudyId,
      subjectUserId: actorId,
      confirmerUserId: proof?.confirmingUserId ?? null,
      attributionHash: input.attributionHash,
      policyVersion: input.policyVersion,
      action: input.action,
      decidedAt: sql`clock_timestamp()`,
    });
    const accepted = input.action === "accept";
    await tx
      .update(CaseStudyContributor)
      .set({ display: accepted, updatedAt: new Date() })
      .where(eq(CaseStudyContributor.id, contributor.id));
    if (!accepted && study.publishedRevisionId) {
      const [published] = await tx
        .select({
          ids: CaseStudyRevision.attributionSubjectIds,
          hashes: CaseStudyRevision.attributionHashes,
        })
        .from(CaseStudyRevision)
        .where(eq(CaseStudyRevision.id, study.publishedRevisionId));
      if (
        published?.ids.some(
          (id, index) =>
            id === actorId && published.hashes[index] === input.attributionHash,
        )
      )
        await suspendIfPublished(tx, study, actorId, "consent_revoked");
    }
    return { action: input.action, displayed: accepted };
  });
}

export async function setContributorEdit(
  actorId: string,
  input: { caseStudyId: string; contributorUserId: string; canEdit: boolean },
) {
  return db.transaction(async (tx) => {
    await ownedStudy(tx, input.caseStudyId, actorId);
    const [contributor] = await tx
      .select({ attribution: CaseStudyContributor.attribution })
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, input.caseStudyId),
          eq(CaseStudyContributor.userId, input.contributorUserId),
        ),
      );
    if (!contributor) unavailable();
    if (input.canEdit) {
      const hash = attributionHash(
        caseStudyAttributionSchema.parse(contributor.attribution),
      );
      const [proof] = await tx
        .select({
          confirmingUserId: CaseStudyInvitation.confirmingUserId,
        })
        .from(CaseStudyInvitation)
        .where(
          and(
            eq(CaseStudyInvitation.caseStudyId, input.caseStudyId),
            eq(CaseStudyInvitation.redeemerUserId, input.contributorUserId),
            eq(CaseStudyInvitation.attributionHash, hash),
            eq(CaseStudyInvitation.status, "consumed"),
          ),
        )
        .limit(1);
      if (!proof?.confirmingUserId) unavailable();
    }
    const [updated] = await tx
      .update(CaseStudyContributor)
      .set({ canEdit: input.canEdit, updatedAt: new Date() })
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, input.caseStudyId),
          eq(CaseStudyContributor.userId, input.contributorUserId),
        ),
      )
      .returning({ canEdit: CaseStudyContributor.canEdit });
    if (!updated) unavailable();
    return updated;
  });
}

export async function removeContributor(
  actorId: string,
  studyId: string,
  contributorUserId: string,
) {
  return db.transaction(async (tx) => {
    const study = await ownedStudy(tx, studyId, actorId);
    const [contributor] = await tx
      .select({ id: CaseStudyContributor.id })
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, studyId),
          eq(CaseStudyContributor.userId, contributorUserId),
        ),
      );
    if (!contributor) unavailable();
    if (study.publishedRevisionId) {
      const [published] = await tx
        .select({ ids: CaseStudyRevision.attributionSubjectIds })
        .from(CaseStudyRevision)
        .where(eq(CaseStudyRevision.id, study.publishedRevisionId));
      if (published?.ids.includes(contributorUserId))
        await suspendIfPublished(tx, study, actorId, "privacy_request");
    }
    await tx
      .delete(CaseStudyInvitation)
      .where(
        and(
          eq(CaseStudyInvitation.caseStudyId, studyId),
          or(
            eq(CaseStudyInvitation.targetUserId, contributorUserId),
            eq(CaseStudyInvitation.redeemerUserId, contributorUserId),
          ),
        ),
      );
    await tx
      .delete(CaseStudyContributor)
      .where(eq(CaseStudyContributor.id, contributor.id));
    return { removed: true };
  });
}

export async function offerTransfer(
  actorId: string,
  studyId: string,
  targetUserId: string,
) {
  const token = randomBytes(32).toString("base64url");
  return db.transaction(async (tx) => {
    await ownedStudy(tx, studyId, actorId);
    if (targetUserId === actorId)
      conflict("Ownership is already held by this account.");
    const [target] = await tx
      .select({ id: User.id })
      .from(User)
      .where(eq(User.id, targetUserId));
    if (!target) conflict("The target account does not exist.");
    const [invitation] = await tx
      .insert(CaseStudyInvitation)
      .values({
        caseStudyId: studyId,
        targetUserId,
        tokenHash: digest(token),
        attributionHash: transferHash(studyId, targetUserId),
        expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS - 60_000),
      })
      .returning({
        id: CaseStudyInvitation.id,
        expiresAt: CaseStudyInvitation.expiresAt,
      });
    return { ...invitation, token };
  });
}

export async function acceptTransfer(actorId: string, token: string) {
  return db.transaction(async (tx) => {
    await lockedUser(tx, actorId);
    const [candidate] = await tx
      .select({ caseStudyId: CaseStudyInvitation.caseStudyId })
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.tokenHash, digest(token)));
    if (!candidate) unavailable();
    const study = await lockedStudy(tx, candidate.caseStudyId);
    const [invitation] = await tx
      .select()
      .from(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.tokenHash, digest(token)))
      .for("update");
    if (!invitation) unavailable();
    if (
      invitation.status !== "pending" ||
      invitation.expiresAt <= new Date() ||
      invitation.targetUserId !== actorId ||
      invitation.attributionHash !== transferHash(study.id, actorId) ||
      !study.ownerUserId ||
      study.visibility === "withdrawn"
    )
      unavailable();
    const priorOwner = study.ownerUserId;
    await suspendIfPublished(tx, study, actorId, "ownership_transfer");
    await tx
      .update(CaseStudy)
      .set({
        ownerUserId: actorId,
        visibility: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(CaseStudy.id, study.id));
    await tx
      .update(CaseStudyDraft)
      .set({ ownerUserId: actorId, updatedAt: new Date() })
      .where(eq(CaseStudyDraft.caseStudyId, study.id));
    await tx
      .update(CaseStudyContributor)
      .set({ display: false, canEdit: false, updatedAt: new Date() })
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, study.id),
          eq(CaseStudyContributor.userId, priorOwner),
        ),
      );
    await tx
      .update(CaseStudyInvitation)
      .set({
        status: "consumed",
        tokenHash: null,
        redeemerUserId: actorId,
        confirmingUserId: actorId,
      })
      .where(eq(CaseStudyInvitation.id, invitation.id));
    await tx
      .update(CaseStudyInvitation)
      .set({ status: "revoked", tokenHash: null })
      .where(
        and(
          eq(CaseStudyInvitation.caseStudyId, study.id),
          eq(CaseStudyInvitation.status, "pending"),
        ),
      );
    const [latest] = await tx
      .select({ id: CaseStudyRevision.id })
      .from(CaseStudyRevision)
      .where(eq(CaseStudyRevision.caseStudyId, study.id))
      .orderBy(desc(CaseStudyRevision.revisionNo))
      .limit(1);
    if (latest)
      await tx.insert(CaseStudyPublicationEvent).values({
        action: "transfer",
        actorUserId: actorId,
        reasonCode: "ownership_transfer",
        revisionId: latest.id,
      });
    return { caseStudyId: study.id, ownerUserId: actorId };
  });
}

export async function withdrawStudy(actorId: string, studyId: string) {
  return db.transaction(async (tx) => {
    const study = await ownedStudy(tx, studyId, actorId);
    await tx
      .update(CaseStudy)
      .set({
        visibility: "withdrawn",
        publishedRevisionId: null,
        updatedAt: new Date(),
      })
      .where(eq(CaseStudy.id, studyId));
    await tx
      .delete(CaseStudyDraft)
      .where(eq(CaseStudyDraft.caseStudyId, studyId));
    await tx
      .delete(CaseStudyInvitation)
      .where(eq(CaseStudyInvitation.caseStudyId, studyId));
    const revisions = await tx
      .select({ id: CaseStudyRevision.id })
      .from(CaseStudyRevision)
      .where(eq(CaseStudyRevision.caseStudyId, studyId))
      .orderBy(desc(CaseStudyRevision.revisionNo));
    const latest = revisions[0];
    if (revisions.length) {
      const revisionIds = revisions.map((revision) => revision.id);
      await tx
        .update(CaseStudyRevision)
        .set({
          privateEvidence: null,
          redactedAt: sql`coalesce(${CaseStudyRevision.redactedAt}, now())`,
        })
        .where(
          and(
            inArray(CaseStudyRevision.id, revisionIds),
            isNotNull(CaseStudyRevision.privateEvidence),
          ),
        );
      await tx
        .update(CaseStudyReviewDecision)
        .set({
          feedback: null,
          redactedAt: sql`coalesce(${CaseStudyReviewDecision.redactedAt}, now())`,
        })
        .where(
          and(
            inArray(CaseStudyReviewDecision.revisionId, revisionIds),
            isNotNull(CaseStudyReviewDecision.feedback),
          ),
        );
    }
    if (latest)
      await tx.insert(CaseStudyPublicationEvent).values({
        action: "withdraw",
        actorUserId: actorId,
        reasonCode: "owner_request",
        revisionId: study.publishedRevisionId ?? latest.id,
      });
    return { withdrawn: true };
  });
}
