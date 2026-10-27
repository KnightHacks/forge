import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

type Db = typeof import("@forge/db/client").db;
type Service = typeof import("../../case-studies/service");

const content = {
  title: "Built by the Knight Hacks community",
  summary: "A technical summary of an independent project.",
  problem: "The team needed a reliable way to organize information.",
  approach: "We compared several designs and selected a small web app.",
  implementation: "The app uses TypeScript and PostgreSQL for its core flows.",
  outcomes: "The team delivered and measured the result.",
  technologies: ["TypeScript", "PostgreSQL"],
  links: { repository: "https://github.com/knighthacks/example" },
  images: [],
};
const attribution = {
  displayName: "Community Contributor",
  contribution: "Built the database layer",
  links: ["https://github.com/knighthacks"],
  displayScope: "credits" as const,
};

describe.skipIf(!canRunDatabaseTests())(
  "case-study authoring and consent on PostgreSQL",
  () => {
    let disposable: DisposableDatabase | undefined;
    let db: Db;
    let service: Service;
    let schema: typeof import("@forge/db/schemas/case-studies");
    let user: typeof import("@forge/db/schemas/auth").User;
    let cleanup: typeof import("../../case-studies/account-deletion").cleanupProjectsForDeletedAccount;
    const owner = randomUUID();
    const coauthor = randomUUID();
    const stranger = randomUUID();

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("case_study_api");
      vi.stubEnv("DATABASE_URL", disposable.url);
      ({ db } = await import("@forge/db/client"));
      service = await import("../../case-studies/service");
      schema = await import("@forge/db/schemas/case-studies");
      ({ User: user } = await import("@forge/db/schemas/auth"));
      ({ cleanupProjectsForDeletedAccount: cleanup } =
        await import("../../case-studies/account-deletion"));
      await db.insert(user).values([
        { id: owner, discordUserId: `owner-${owner}` },
        { id: coauthor, discordUserId: `coauthor-${coauthor}` },
        { id: stranger, discordUserId: `stranger-${stranger}` },
      ]);
    }, 120_000);

    afterAll(async () => {
      await db.$client.end();
      await disposable?.drop();
      vi.unstubAllEnvs();
    }, 30_000);

    async function draftStudy() {
      const study = await service.createStudy(owner, `study-${randomUUID()}`);
      await service.saveDraft(owner, {
        caseStudyId: study.id,
        expectedVersion: 0,
        content,
      });
      return study;
    }

    it("returns a conflict for sequential and concurrent slug collisions", async () => {
      const slug = `study-${randomUUID()}`;
      const attempts = await Promise.allSettled([
        service.createStudy(owner, slug),
        service.createStudy(stranger, slug),
      ]);
      expect(
        attempts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        attempts.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      await expect(service.createStudy(owner, slug)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });

    it("isolates owners, rejects stale saves, and freezes submitted content", async () => {
      const study = await draftStudy();
      await expect(
        service.getMyStudy(stranger, study.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        service.saveDraft(stranger, {
          caseStudyId: study.id,
          expectedVersion: 1,
          content,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const results = await Promise.allSettled([
        service.saveDraft(owner, {
          caseStudyId: study.id,
          expectedVersion: 1,
          content,
        }),
        service.saveDraft(owner, {
          caseStudyId: study.id,
          expectedVersion: 1,
          content,
        }),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      const submitted = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 2,
        authorConnection: "community",
        privateEvidenceUrls: ["https://example.org/evidence"],
      });
      expect(submitted.revisionNo).toBe(1);
      await expect(
        service.submitStudy(stranger, {
          caseStudyId: study.id,
          expectedVersion: 2,
          authorConnection: "community",
          privateEvidenceUrls: [],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        db
          .update(schema.CaseStudyRevision)
          .set({ content: { title: "tampered" } })
          .where(eq(schema.CaseStudyRevision.id, submitted.id)),
      ).rejects.toThrow();
    });

    it("binds a single-use invitation to the account and attribution snapshot", async () => {
      const study = await draftStudy();
      const invitation = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      await expect(
        service.listContributors(stranger, study.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(await service.listContributors(owner, study.id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: coauthor,
            display: false,
            canEdit: false,
          }),
        ]),
      );
      await expect(
        service.redeemInvitation(stranger, invitation.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.redeemInvitation(coauthor, invitation.token);
      await expect(
        service.redeemInvitation(coauthor, invitation.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const [stored] = await db
        .select()
        .from(schema.CaseStudyInvitation)
        .where(eq(schema.CaseStudyInvitation.id, invitation.id));
      expect(stored?.tokenHash).toBeNull();
      const hash = service.attributionHash(attribution);
      await expect(
        service.decideConsent(stranger, {
          caseStudyId: study.id,
          attributionHash: hash,
          policyVersion: 1,
          action: "accept",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: hash,
        policyVersion: 1,
        action: "accept",
      });
      const [contributor] = await db
        .select()
        .from(schema.CaseStudyContributor)
        .where(eq(schema.CaseStudyContributor.caseStudyId, study.id));
      expect(contributor).toMatchObject({
        userId: coauthor,
        canEdit: false,
        display: true,
      });
      const first = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "alumni",
        privateEvidenceUrls: [],
      });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudyRevision)
            .where(eq(schema.CaseStudyRevision.id, first.id))
        )[0]?.attributionHashes,
      ).toEqual([hash]);
      await service.saveDraft(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        content: {
          ...content,
          outcomes: "A later result with the same attribution.",
        },
      });
      const second = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 2,
        authorConnection: "alumni",
        privateEvidenceUrls: [],
      });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudyRevision)
            .where(eq(schema.CaseStudyRevision.id, second.id))
        )[0]?.attributionHashes,
      ).toEqual([hash]);
      await expect(
        service.saveDraft(coauthor, {
          caseStudyId: study.id,
          expectedVersion: 2,
          content,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: hash,
        policyVersion: 1,
        action: "revoke",
      });
      expect(
        (await service.getMyAttribution(coauthor, study.id)).currentDecision
          ?.action,
      ).toBe("revoke");
    });

    it("freezes nominated attribution before consent and never grants pending invitees edit access", async () => {
      const study = await draftStudy();
      const invitation = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      await expect(
        service.setContributorEdit(owner, {
          caseStudyId: study.id,
          contributorUserId: coauthor,
          canEdit: true,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const revision = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "community",
        privateEvidenceUrls: [],
      });
      const [frozen] = await db
        .select()
        .from(schema.CaseStudyRevision)
        .where(eq(schema.CaseStudyRevision.id, revision.id));
      expect(frozen?.attributionSubjectIds).toEqual([coauthor]);
      expect(frozen?.attributionHashes).toEqual([
        service.attributionHash(attribution),
      ]);
      await service.redeemInvitation(coauthor, invitation.token);
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: service.attributionHash(attribution),
        policyVersion: 1,
        action: "accept",
      });
      await service.setContributorEdit(owner, {
        caseStudyId: study.id,
        contributorUserId: coauthor,
        canEdit: true,
      });
      await expect(
        service.saveDraft(coauthor, {
          caseStudyId: study.id,
          expectedVersion: 1,
          content,
        }),
      ).resolves.toMatchObject({ version: 2 });
      await expect(
        service.submitStudy(coauthor, {
          caseStudyId: study.id,
          expectedVersion: 2,
          authorConnection: "community",
          privateEvidenceUrls: [],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("requires fresh consent for changed attribution and suspends the affected publication", async () => {
      const study = await draftStudy();
      const first = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      const revision = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "alumni",
        privateEvidenceUrls: [],
      });
      await service.redeemInvitation(coauthor, first.token);
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: service.attributionHash(attribution),
        policyVersion: 1,
        action: "accept",
      });
      await db
        .update(schema.CaseStudy)
        .set({ publishedRevisionId: revision.id })
        .where(eq(schema.CaseStudy.id, study.id));
      const same = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudy)
            .where(eq(schema.CaseStudy.id, study.id))
        )[0]?.publishedRevisionId,
      ).toBe(revision.id);
      const changed = { ...attribution, contribution: "Built the API" };
      const next = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution: changed,
      });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudy)
            .where(eq(schema.CaseStudy.id, study.id))
        )[0],
      ).toMatchObject({ publishedRevisionId: null, visibility: "suspended" });
      await expect(
        service.decideConsent(coauthor, {
          caseStudyId: study.id,
          attributionHash: service.attributionHash(attribution),
          policyVersion: 1,
          action: "accept",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.redeemInvitation(coauthor, next.token);
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: service.attributionHash(changed),
        policyVersion: 1,
        action: "accept",
      });
      expect(
        (await service.getMyAttribution(coauthor, study.id)).attributionHash,
      ).toBe(service.attributionHash(changed));
      await expect(
        service.redeemInvitation(coauthor, same.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("requires owner confirmation for an unbound recipient and receiver acceptance for transfer", async () => {
      const study = await draftStudy();
      const invitation = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        attribution,
      });
      await service.redeemInvitation(coauthor, invitation.token);
      await expect(
        service.listInvitations(stranger, study.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(await service.listInvitations(owner, study.id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: invitation.id,
            redeemerUserId: coauthor,
            status: "consumed",
          }),
        ]),
      );
      await db
        .update(schema.CaseStudyInvitation)
        .set({ expiresAt: new Date(Date.now() - 1_000) })
        .where(eq(schema.CaseStudyInvitation.id, invitation.id));
      await expect(
        service.decideConsent(coauthor, {
          caseStudyId: study.id,
          attributionHash: service.attributionHash(attribution),
          policyVersion: 1,
          action: "accept",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        service.confirmContributor(stranger, invitation.id, attribution),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.confirmContributor(owner, invitation.id, attribution);
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: service.attributionHash(attribution),
        policyVersion: 1,
        action: "accept",
      });
      const [decision] = await db
        .select()
        .from(schema.CaseStudyConsentDecision)
        .where(eq(schema.CaseStudyConsentDecision.caseStudyId, study.id));
      expect(decision).toMatchObject({
        subjectUserId: coauthor,
        confirmerUserId: owner,
      });
      const offer = await service.offerTransfer(owner, study.id, stranger);
      await expect(
        service.acceptTransfer(coauthor, offer.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        service.redeemInvitation(stranger, offer.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.acceptTransfer(stranger, offer.token);
      await expect(
        service.acceptTransfer(stranger, offer.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudy)
            .where(eq(schema.CaseStudy.id, study.id))
        )[0],
      ).toMatchObject({ ownerUserId: stranger, visibility: "suspended" });
      await expect(
        service.saveDraft(owner, {
          caseStudyId: study.id,
          expectedVersion: 1,
          content,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("serializes concurrent consent and ownership changes without restoring publication", async () => {
      const study = await draftStudy();
      const invitation = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      const revision = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "community",
        privateEvidenceUrls: [],
      });
      await service.redeemInvitation(coauthor, invitation.token);
      const hash = service.attributionHash(attribution);
      const accepts = await Promise.allSettled([
        service.decideConsent(coauthor, {
          caseStudyId: study.id,
          attributionHash: hash,
          policyVersion: 1,
          action: "accept",
        }),
        service.decideConsent(coauthor, {
          caseStudyId: study.id,
          attributionHash: hash,
          policyVersion: 1,
          action: "accept",
        }),
      ]);
      expect(
        accepts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      await db
        .update(schema.CaseStudy)
        .set({ publishedRevisionId: revision.id })
        .where(eq(schema.CaseStudy.id, study.id));
      const offer = await service.offerTransfer(owner, study.id, stranger);
      const outcomes = await Promise.allSettled([
        service.decideConsent(coauthor, {
          caseStudyId: study.id,
          attributionHash: hash,
          policyVersion: 1,
          action: "revoke",
        }),
        service.acceptTransfer(stranger, offer.token),
      ]);
      expect(outcomes.every((result) => result.status === "fulfilled")).toBe(
        true,
      );
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudy)
            .where(eq(schema.CaseStudy.id, study.id))
        )[0],
      ).toMatchObject({
        ownerUserId: stranger,
        publishedRevisionId: null,
        visibility: "suspended",
      });
      expect(
        (await service.getMyAttribution(coauthor, study.id)).currentDecision
          ?.action,
      ).toBe("revoke");
    });

    it("serializes transfer into an account with that account's deletion", async () => {
      const target = randomUUID();
      await db
        .insert(user)
        .values({ id: target, discordUserId: `target-${target}` });
      const study = await draftStudy();
      const offer = await service.offerTransfer(owner, study.id, target);
      const outcomes = await Promise.allSettled([
        service.acceptTransfer(target, offer.token),
        db.transaction(async (tx) => {
          await cleanup(tx, target);
          await tx.delete(user).where(eq(user.id, target));
        }),
      ]);
      expect(outcomes[1].status).toBe("fulfilled");
      const [after] = await db
        .select()
        .from(schema.CaseStudy)
        .where(eq(schema.CaseStudy.id, study.id));
      expect(after?.ownerUserId).not.toBe(target);
      if (outcomes[0].status === "fulfilled")
        expect(after).toMatchObject({
          ownerUserId: null,
          visibility: "withdrawn",
        });
      else expect(after?.ownerUserId).toBe(owner);
    });

    it("suspends publication on revocation and redacts a departing coauthor", async () => {
      const study = await draftStudy();
      const invitation = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: coauthor,
        attribution,
      });
      const revision = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "member",
        privateEvidenceUrls: [],
      });
      await service.redeemInvitation(coauthor, invitation.token);
      const hash = service.attributionHash(attribution);
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: hash,
        policyVersion: 1,
        action: "accept",
      });
      await db
        .update(schema.CaseStudy)
        .set({ publishedRevisionId: revision.id })
        .where(eq(schema.CaseStudy.id, study.id));
      await service.decideConsent(coauthor, {
        caseStudyId: study.id,
        attributionHash: hash,
        policyVersion: 1,
        action: "revoke",
      });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudy)
            .where(eq(schema.CaseStudy.id, study.id))
        )[0],
      ).toMatchObject({ publishedRevisionId: null, visibility: "suspended" });
      await db.transaction((tx) => cleanup(tx, coauthor));
      await db.delete(user).where(eq(user.id, coauthor));
      expect(
        await db
          .select()
          .from(schema.CaseStudyContributor)
          .where(eq(schema.CaseStudyContributor.caseStudyId, study.id)),
      ).toHaveLength(0);
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudyRevision)
            .where(eq(schema.CaseStudyRevision.id, revision.id))
        )[0],
      ).toMatchObject({ content: null, privateEvidence: null });
      expect(
        (
          await db
            .select()
            .from(schema.CaseStudyConsentDecision)
            .where(eq(schema.CaseStudyConsentDecision.caseStudyId, study.id))
        ).map((row) => row.action),
      ).toEqual(["accept", "revoke"]);
    });

    it("lets the owner revoke a pending invitation and remove a contributor", async () => {
      const recipient = randomUUID();
      await db
        .insert(user)
        .values({ id: recipient, discordUserId: `recipient-${recipient}` });
      const study = await draftStudy();
      const first = await service.inviteContributor(owner, {
        caseStudyId: study.id,
        targetUserId: recipient,
        attribution,
      });
      await expect(
        service.revokeInvitation(stranger, first.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.revokeInvitation(owner, first.id);
      await expect(
        service.redeemInvitation(recipient, first.token),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await service.removeContributor(owner, study.id, recipient);
      expect(
        await db
          .select()
          .from(schema.CaseStudyContributor)
          .where(eq(schema.CaseStudyContributor.caseStudyId, study.id)),
      ).toHaveLength(0);
    });

    it("withdraws and redacts on account deletion without blocking auth-user deletion", async () => {
      const study = await draftStudy();
      const revision = await service.submitStudy(owner, {
        caseStudyId: study.id,
        expectedVersion: 1,
        authorConnection: "member",
        privateEvidenceUrls: ["https://example.org/evidence"],
      });
      await db
        .update(schema.CaseStudy)
        .set({ publishedRevisionId: revision.id })
        .where(eq(schema.CaseStudy.id, study.id));
      await db.transaction((tx) => cleanup(tx, owner));
      await db.delete(user).where(eq(user.id, owner));
      const [after] = await db
        .select()
        .from(schema.CaseStudy)
        .where(eq(schema.CaseStudy.id, study.id));
      const [redacted] = await db
        .select()
        .from(schema.CaseStudyRevision)
        .where(eq(schema.CaseStudyRevision.id, revision.id));
      expect(after).toMatchObject({
        ownerUserId: null,
        visibility: "withdrawn",
        publishedRevisionId: null,
      });
      expect(redacted).toMatchObject({
        content: null,
        privateEvidence: null,
        submitterUserId: owner,
      });
      expect(redacted?.redactedAt).not.toBeNull();
    });
  },
);
