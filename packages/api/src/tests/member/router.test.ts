import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { SelectMember } from "@forge/db/schemas/knight-hacks";
import { Permissions, User } from "@forge/db/schemas/auth";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";
import { MEMBER_SIGNUP_FORM_ID } from "@forge/validators";

import { memberRouter } from "../../routers/member";
import { createCallerFactory, createTRPCRouter } from "../../trpc";
import { memberSignupFormConfig } from "../../utils/member/onboarding";
import { AUDIT_EVENT_ID, createAuditRecorder } from "../support/audit-recorder";

const mocks = vi.hoisted(() => ({
  db: {
    // `appendAdminAuditResults` runs after the transaction commits, against the
    // top-level client rather than `tx`, so the storage-cleanup results it
    // records need select and insert here too.
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
  normalizeProfilePictureObjectNameForPersistence: vi.fn(),
  normalizeResumeObjectNameForPersistence: vi.fn(),
  removeProfilePictureObjectsForUser: vi.fn(),
  removeUnreferencedResumeObjectsForUser: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

vi.mock("../../utils/profile-picture/storage", () => ({
  normalizeProfilePictureObjectNameForPersistence:
    mocks.normalizeProfilePictureObjectNameForPersistence,
  removeProfilePictureObjectsForUser: mocks.removeProfilePictureObjectsForUser,
}));

vi.mock("../../utils/resume/storage", () => ({
  normalizeResumeObjectNameForPersistence:
    mocks.normalizeResumeObjectNameForPersistence,
  removeUnreferencedResumeObjectsForUser:
    mocks.removeUnreferencedResumeObjectsForUser,
}));

const userId = "00000000-0000-4000-8000-000000000001";
const session = {
  user: {
    id: userId,
    name: "fresh-discord-user",
  },
} as Session;

const callerFactory = createCallerFactory(
  createTRPCRouter({
    member: memberRouter,
  }),
);

const existingMember = {
  about: "Old Guild bio",
  age: 24,
  company: "Knight Hacks",
  dateCreated: "2025-05-26",
  discordUser: "old-discord-user",
  dob: "2000-02-03",
  email: "old@example.test",
  firstName: "Old",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/knighthacks",
  gradDate: "2027-05-02",
  guildProfileVisible: true,
  // A real UUID: audit subjects are validated as UUIDs, so a placeholder
  // string fails subject validation before the delete ever runs.
  id: "11111111-1111-4111-8111-111111111111",
  lastName: "Member",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  phoneNumber: "321-555-0100",
  points: 0,
  profilePictureUrl: "00000000-0000-4000-8000-000000000001/profile-picture.png",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "00000000-0000-4000-8000-000000000001/resume.pdf",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Old tagline",
  timeCreated: "01:47:26",
  userId,
  websiteUrl: "https://knighthacks.org",
} as SelectMember;

const updatedMember = {
  ...existingMember,
  about: "Updated Guild bio",
  age: 25,
  company: "Forge",
  discordUser: "fresh-discord-user",
  email: "new@example.test",
  firstName: "New",
  githubProfileUrl: "https://github.com/dvidal1205",
  guildProfileVisible: false,
  lastName: "Member",
  phoneNumber: "321-555-0101",
  tagline: "Updated tagline",
  websiteUrl: "https://dvidal.dev",
} as SelectMember;

const updateInput = {
  about: "Updated Guild bio",
  company: "Forge",
  dob: "2000-02-03",
  email: "new@example.test",
  firstName: "New",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/dvidal1205",
  gradTerm: "Spring",
  gradYear: 2027,
  guildProfileVisible: false,
  lastName: "Member",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  phoneNumber: "321-555-0101",
  raceOrEthnicity: "Prefer not to answer",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Updated tagline",
  websiteUrl: "https://dvidal.dev",
} as const;

type UpdateResult = Error | unknown[];

// Most callers await `where(...)` directly, but the audit path chains `.limit(1)`
// onto it and joins through `.innerJoin(...)` when resolving the actor snapshot.
// Returning a promise that also carries those methods supports every shape
// without each caller having to know which one it got.
interface SelectChain extends Promise<unknown[]> {
  innerJoin: () => SelectChain;
  leftJoin: () => SelectChain;
  orderBy: () => Promise<unknown[]>;
  where: () => Promise<unknown[]> & { limit: () => Promise<unknown[]> };
}

function createSelectMock(readIdentityRows: () => unknown[]) {
  const where = vi.fn(() =>
    Object.assign(Promise.resolve([]), {
      limit: vi.fn(() => Promise.resolve(readIdentityRows())),
    }),
  );
  // Loading the club team configuration for the actor's role badge ends the
  // chain at `.orderBy(...)` and at `.leftJoin(...)` rather than at `.where`,
  // so the chain itself has to be awaitable at any point.
  const chain: SelectChain = Object.assign(Promise.resolve<unknown[]>([]), {
    innerJoin: vi.fn((): SelectChain => chain),
    leftJoin: vi.fn((): SelectChain => chain),
    orderBy: vi.fn(() => Promise.resolve<unknown[]>([])),
    where,
  });

  return vi.fn(() => ({ from: vi.fn(() => chain) }));
}

function createInsertMock(audit: ReturnType<typeof createAuditRecorder>) {
  const values = vi.fn(() => ({
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([{ id: "backfilled-response-id" }]),
  }));
  const insert = vi.fn((table: unknown) => audit.insert(table) ?? { values });

  return { insert, values };
}

function createUpdateMock(results: UpdateResult[]) {
  const setValues: unknown[] = [];
  const returningResults = [...results];
  const update = vi.fn(() => ({
    set: vi.fn((values: unknown) => {
      setValues.push(values);

      return {
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            const result = returningResults.shift() ?? [];

            if (result instanceof Error) return Promise.reject(result);

            return Promise.resolve(result);
          }),
        })),
      };
    }),
  }));

  return {
    setValues,
    update,
  };
}

function createDeleteMock(results: unknown[][] = [[{ id: userId }]]) {
  const deletedTables: unknown[] = [];
  const returningResults = [...results];
  const remove = vi.fn((table: unknown) => {
    deletedTables.push(table);

    return {
      where: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve(returningResults.shift() ?? [{ id: userId }]),
        ),
      })),
    };
  });

  return { delete: remove, deletedTables };
}

function createTransactionMock({
  existingMember: memberRow = existingMember,
  existingSignupResponse = { responseData: { codeOfConductAccepted: false } },
  deleteResults,
  updateResults = [[updatedMember], [{ id: "form-response-id" }]],
}: {
  existingMember?: SelectMember | null;
  existingSignupResponse?: { responseData: unknown } | null;
  deleteResults?: unknown[][];
  updateResults?: UpdateResult[];
} = {}) {
  const audit = createAuditRecorder();
  const deleteMock = createDeleteMock(deleteResults);
  const insertMock = createInsertMock(audit);
  const updateMock = createUpdateMock(updateResults);
  const memberIdentityRows = memberRow
    ? [
        {
          discordUser: memberRow.discordUser,
          firstName: memberRow.firstName,
          id: memberRow.id,
          lastName: memberRow.lastName,
        },
      ]
    : [];
  const formResponseFindFirst = vi
    .fn()
    .mockResolvedValueOnce(existingSignupResponse)
    .mockResolvedValueOnce(
      existingSignupResponse ? { id: "form-response-id" } : null,
    );
  const tx = {
    delete: deleteMock.delete,
    insert: insertMock.insert,
    query: {
      FormResponse: {
        findFirst: formResponseFindFirst,
      },
      FormsSchemas: {
        findFirst: vi.fn().mockResolvedValue({
          ...memberSignupFormConfig,
          archivedAt: null,
          closesAt: null,
          kind: "system",
          manuallyClosed: false,
          opensAt: null,
          publishedAt: new Date(),
          responseMode: "single_locked",
          revision: 1,
          state: "published",
        }),
      },
      Member: {
        findFirst: vi.fn().mockResolvedValue(memberRow),
      },
    },
    // The member row is gone once it has been deleted, so the identity lookup
    // and the actor snapshot only resolve while the audit event is written
    // ahead of the deletes.
    select: createSelectMock(() =>
      deleteMock.deletedTables.includes(Member) ? [] : memberIdentityRows,
    ),
    update: updateMock.update,
  };

  // `appendAdminAuditResults` runs after the transaction commits, against the
  // top-level client rather than `tx`.
  mocks.db.select.mockImplementation(audit.select);
  mocks.db.insert.mockImplementation(audit.insert);

  mocks.db.transaction.mockImplementation(
    (callback: (txHandle: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  );

  return {
    formResponseFindFirst,
    auditEvents: audit.events,
    auditSubjects: audit.subjects,
    delete: deleteMock.delete,
    insertValues: insertMock.values,
    setValues: updateMock.setValues,
    tx,
    update: updateMock.update,
  };
}

function createCaller() {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "member-router-test",
  });
}

describe("member.updateGuildPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the authenticated member's Guild preference fields", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        guildOpportunityStatuses: ["internships"],
        guildProfileVisible: true,
        guildResumeVisible: false,
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.db.update.mockReturnValue({ set });

    await expect(
      createCaller().member.updateGuildPreferences({
        guildOpportunityStatuses: ["internships"],
        guildResumeVisible: false,
      }),
    ).resolves.toEqual({
      guildOpportunityStatuses: ["internships"],
      guildProfileVisible: true,
      guildResumeVisible: false,
    });

    expect(set).toHaveBeenCalledWith({
      guildOpportunityStatuses: ["internships"],
      guildResumeVisible: false,
    });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid preference selections before writing", async () => {
    await expect(
      createCaller().member.updateGuildPreferences({
        guildOpportunityStatuses: ["internships", "internships"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("does not reveal whether a member exists to an anonymous writer", async () => {
    const anonymousCaller = callerFactory({
      headers: new Headers(),
      session: null,
      source: "member-router-test",
    });

    await expect(
      anonymousCaller.member.updateGuildPreferences({
        guildResumeVisible: false,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});

describe("member.updateMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the member row and existing signup response in one transaction", async () => {
    const transaction = createTransactionMock();

    const result = await createCaller().member.updateMember(updateInput);

    expect(result).toMatchObject({
      discordUser: "fresh-discord-user",
      email: "new@example.test",
      firstName: "New",
      guildProfileVisible: false,
    });
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(transaction.setValues[0]).toMatchObject({
      discordUser: "fresh-discord-user",
      email: "new@example.test",
      firstName: "New",
      guildProfileVisible: false,
    });
    const responseUpdateValues = transaction.setValues[1] as {
      editedAt: Date;
      responseData: Record<string, unknown>;
    };

    expect(responseUpdateValues.editedAt).toBeInstanceOf(Date);
    expect(responseUpdateValues.responseData).toMatchObject({
      codeOfConductAccepted: false,
      email: "new@example.test",
      firstName: "New",
      profilePictureUrl: existingMember.profilePictureUrl,
      resumeUrl: existingMember.resumeUrl,
    });
    expect(transaction.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MEMBER_SIGNUP_FORM_ID,
      }),
    );
  });

  it("backfills a missing signup response with Code of Conduct compatibility", async () => {
    const transaction = createTransactionMock({
      existingSignupResponse: null,
    });

    await createCaller().member.updateMember(updateInput);

    expect(transaction.setValues).toHaveLength(1);
    expect(transaction.insertValues).toHaveBeenCalledWith({
      form: MEMBER_SIGNUP_FORM_ID,
      responseData: expect.objectContaining({
        codeOfConductAccepted: true,
        email: "new@example.test",
        firstName: "New",
      }) as Record<string, unknown>,
      userId,
    });
  });

  it("bubbles response sync failures through the surrounding transaction", async () => {
    createTransactionMock({
      updateResults: [[updatedMember], []],
    });

    await expect(
      createCaller().member.updateMember(updateInput),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Form response could not be updated.",
    });
  });

  it("translates duplicate member fields into safe update errors", async () => {
    const duplicateError = Object.assign(new Error("duplicate key"), {
      code: "23505",
    });
    const transaction = createTransactionMock({
      updateResults: [duplicateError],
    });

    await expect(
      createCaller().member.updateMember(updateInput),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "A member profile with that email or phone number already exists.",
    });
    expect(transaction.formResponseFindFirst).not.toHaveBeenCalled();
  });
});

describe("member.deleteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Both cleanups return an audit result outcome, which is what the appended
    // result subjects record. Distinct values keep them apart in assertions.
    mocks.removeProfilePictureObjectsForUser.mockResolvedValue("succeeded");
    mocks.removeUnreferencedResumeObjectsForUser.mockResolvedValue("skipped");
  });

  it("deletes member profile data and auth identity in one transaction", async () => {
    const transaction = createTransactionMock();

    await expect(createCaller().member.deleteMember()).resolves.toEqual({
      deleted: true,
    });

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(transaction.delete).toHaveBeenNthCalledWith(1, FormResponse);
    expect(transaction.delete).toHaveBeenNthCalledWith(2, Member);
    expect(transaction.delete).toHaveBeenNthCalledWith(3, Permissions);
    expect(transaction.delete).toHaveBeenNthCalledWith(4, User);
    expect(mocks.removeProfilePictureObjectsForUser).toHaveBeenCalledWith(
      userId,
    );
    expect(mocks.removeUnreferencedResumeObjectsForUser).toHaveBeenCalledWith(
      userId,
    );
  });

  it("records the self-service deletion as a member.profile.deleted event", async () => {
    const transaction = createTransactionMock({
      deleteResults: [[{ id: "signup-response-id" }]],
    });

    await createCaller().member.deleteMember();

    expect(transaction.auditEvents).toHaveLength(1);
    expect(transaction.auditEvents[0]).toMatchObject({
      actionKey: "member.profile.deleted",
      // Only resolvable because the event is written before the deletes.
      actorMemberId: existingMember.id,
      actorUserId: userId,
      domain: "members",
      metadata: {
        deletedObjectCount: 4,
        deletedObjectTypes: [
          "member",
          "user",
          "permissions",
          "signup_response",
        ],
      },
      outcome: "committed",
    });
    expect(transaction.auditSubjects[0]).toEqual({
      eventId: AUDIT_EVENT_ID,
      memberId: existingMember.id,
      metadata: {},
      position: 0,
      relation: "primary",
      resultOutcome: null,
      targetId: existingMember.id,
      targetLabel: "Old Member",
      targetType: "member",
    });
  });

  it("appends both storage cleanup outcomes to the audit event", async () => {
    const transaction = createTransactionMock();

    await createCaller().member.deleteMember();

    expect(transaction.auditSubjects.slice(1)).toEqual([
      {
        eventId: AUDIT_EVENT_ID,
        memberId: null,
        metadata: {},
        position: 1,
        relation: "result",
        resultOutcome: "succeeded",
        targetId: `profile-picture-cleanup:${userId}`,
        targetLabel: "Profile picture storage cleanup",
        targetType: "provider",
      },
      {
        eventId: AUDIT_EVENT_ID,
        memberId: null,
        metadata: {},
        position: 2,
        relation: "result",
        resultOutcome: "skipped",
        targetId: `resume-cleanup:${userId}`,
        targetLabel: "Résumé storage cleanup",
        targetType: "provider",
      },
    ]);
  });

  it("does not delete auth identity when the member profile is missing", async () => {
    const transaction = createTransactionMock({ existingMember: null });

    await expect(createCaller().member.deleteMember()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Member profile does not exist.",
    });

    expect(transaction.delete).not.toHaveBeenCalled();
    expect(mocks.removeProfilePictureObjectsForUser).not.toHaveBeenCalled();
    expect(mocks.removeUnreferencedResumeObjectsForUser).not.toHaveBeenCalled();
  });
});
