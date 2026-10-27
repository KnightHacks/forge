import type { db } from "@forge/db/client";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "@forge/db";
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
import { caseStudyAttributionSchema } from "@forge/validators";

import { attributionHash } from "./service";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Runs inside Blade's existing self-service account-deletion transaction. */
export async function cleanupProjectsForDeletedAccount(
  tx: Transaction,
  userId: string,
) {
  await tx
    .select({ id: User.id })
    .from(User)
    .where(eq(User.id, userId))
    .for("update");
  const owned = await tx
    .select({ id: CaseStudy.id })
    .from(CaseStudy)
    .where(eq(CaseStudy.ownerUserId, userId));
  const contributing = await tx
    .select({ id: CaseStudyContributor.caseStudyId })
    .from(CaseStudyContributor)
    .where(eq(CaseStudyContributor.userId, userId));
  const attributable = await tx
    .select({ id: CaseStudyRevision.caseStudyId })
    .from(CaseStudyRevision)
    .where(
      or(
        eq(CaseStudyRevision.submitterUserId, userId),
        sql`${userId}::uuid = ANY(${CaseStudyRevision.attributionSubjectIds})`,
      ),
    );
  const ids = [
    ...new Set([
      ...owned.map((row) => row.id),
      ...contributing.map((row) => row.id),
      ...attributable.map((row) => row.id),
    ]),
  ].sort();

  for (const id of ids) {
    const [study] = await tx
      .select()
      .from(CaseStudy)
      .where(eq(CaseStudy.id, id))
      .for("update");
    if (!study) continue;
    const ownerIsDeparting = study.ownerUserId === userId;
    const revisions = await tx
      .select()
      .from(CaseStudyRevision)
      .where(eq(CaseStudyRevision.caseStudyId, id));
    const affected = ownerIsDeparting
      ? revisions
      : revisions.filter(
          (revision) =>
            revision.submitterUserId === userId ||
            revision.attributionSubjectIds.includes(userId),
        );
    const affectedIds = affected.map((revision) => revision.id);
    const publicAffected =
      !!study.publishedRevisionId &&
      (ownerIsDeparting || affectedIds.includes(study.publishedRevisionId));

    if (ownerIsDeparting || publicAffected) {
      await tx
        .update(CaseStudy)
        .set({
          publishedRevisionId: null,
          visibility: ownerIsDeparting ? "withdrawn" : "suspended",
          updatedAt: new Date(),
        })
        .where(eq(CaseStudy.id, id));
      const eventRevision =
        revisions.find(
          (revision) => revision.id === study.publishedRevisionId,
        ) ?? [...revisions].sort((a, b) => b.revisionNo - a.revisionNo)[0];
      if (eventRevision)
        await tx.insert(CaseStudyPublicationEvent).values({
          action: ownerIsDeparting ? "withdraw" : "suspend",
          actorUserId: userId,
          reasonCode: "privacy_request",
          revisionId: eventRevision.id,
        });
    }

    if (ownerIsDeparting) {
      await tx.delete(CaseStudyDraft).where(eq(CaseStudyDraft.caseStudyId, id));
      await tx
        .delete(CaseStudyInvitation)
        .where(eq(CaseStudyInvitation.caseStudyId, id));
    }

    const [contributor] = await tx
      .select()
      .from(CaseStudyContributor)
      .where(
        and(
          eq(CaseStudyContributor.caseStudyId, id),
          eq(CaseStudyContributor.userId, userId),
        ),
      );
    if (contributor) {
      const hash = attributionHash(
        caseStudyAttributionSchema.parse(contributor.attribution),
      );
      const [latest] = await tx
        .select({ action: CaseStudyConsentDecision.action })
        .from(CaseStudyConsentDecision)
        .where(
          and(
            eq(CaseStudyConsentDecision.caseStudyId, id),
            eq(CaseStudyConsentDecision.subjectUserId, userId),
            eq(CaseStudyConsentDecision.attributionHash, hash),
          ),
        )
        .orderBy(
          sql`${CaseStudyConsentDecision.decidedAt} DESC`,
          sql`${CaseStudyConsentDecision.id} DESC`,
        )
        .limit(1);
      if (latest?.action === "accept")
        await tx.insert(CaseStudyConsentDecision).values({
          caseStudyId: id,
          subjectUserId: userId,
          attributionHash: hash,
          policyVersion: 1,
          action: "revoke",
          decidedAt: sql`clock_timestamp()`,
        });
      await tx
        .delete(CaseStudyContributor)
        .where(eq(CaseStudyContributor.id, contributor.id));
    }

    if (affectedIds.length) {
      await tx
        .update(CaseStudyRevision)
        .set({
          content: null,
          privateEvidence: null,
          redactedAt: sql`coalesce(${CaseStudyRevision.redactedAt}, now())`,
        })
        .where(
          and(
            inArray(CaseStudyRevision.id, affectedIds),
            or(
              isNotNull(CaseStudyRevision.content),
              isNotNull(CaseStudyRevision.privateEvidence),
            ),
          ),
        );
      await tx
        .update(CaseStudyReviewDecision)
        .set({ feedback: null, redactedAt: new Date() })
        .where(
          and(
            inArray(CaseStudyReviewDecision.revisionId, affectedIds),
            isNotNull(CaseStudyReviewDecision.feedback),
            isNull(CaseStudyReviewDecision.redactedAt),
          ),
        );
    }
  }
}
