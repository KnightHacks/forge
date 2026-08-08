import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import type { SubmitApplicationInput } from "@forge/hacker-sdk/contracts";
import { and, asc, count, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";
import { HACKER_WITHDRAWAL_ACKNOWLEDGEMENT } from "@forge/validators";

type DatabaseClient = typeof db;
type AuthSchemas = typeof AuthSchemaModule;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;

const DAY_MS = 24 * 60 * 60 * 1_000;
const since = (days: number) => new Date(Date.now() + days * DAY_MS);

/**
 * The participant boundary is transaction-heavy: profile reuse, legal evidence,
 * status mail, pass revocation, and point isolation all depend on real database
 * constraints. These cases therefore use the repository's loopback-only,
 * disposable-database harness rather than a mocked Drizzle chain.
 */
describe.skipIf(!canRunDatabaseTests())("hacker portal lifecycle", () => {
  let auth: AuthSchemas;
  let client: DatabaseClient;
  let disposable: DisposableDatabase | undefined;
  let hashOpaqueHackerCheckInPass: (typeof import("../../utils/hackathon-events/check-in"))["hashOpaqueHackerCheckInPass"];
  let knightHacks: KnightHacksSchemas;
  let templateId: string;
  let templateOwnerId: string;

  function profileInput(label: string): SubmitApplicationInput["profile"] {
    return {
      country: "United States of America",
      dob: "2005-02-14",
      email: `${label}@example.test`,
      firstName: label,
      foodAllergies: null,
      gender: "Prefer not to answer",
      githubProfileUrl: null,
      gradDate: "2028-05-01",
      lastName: "Participant",
      levelOfStudy: "Undergraduate University (3+ year)",
      linkedinProfileUrl: null,
      major: "Computer Science",
      phoneNumber: `407${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      raceOrEthnicity: "Prefer not to answer",
      school: "University of Central Florida",
      shirtSize: "M",
      websiteUrl: null,
    };
  }

  async function seedUser(name: string) {
    const id = randomUUID();
    await client.insert(auth.User).values({
      discordUserId: `discord-${id}`,
      id,
      name,
    });
    return id;
  }

  async function seedHackathon(options?: {
    applicationDeadline?: Date;
    applicationOpen?: Date;
    confirmationCapacity?: number | null;
    confirmationDeadline?: Date;
    endDate?: Date;
    startDate?: Date;
  }) {
    const id = randomUUID();
    const slug = `portal-${id}`;
    await client.insert(knightHacks.Hackathon).values({
      applicationDeadline: options?.applicationDeadline ?? since(10),
      applicationOpen: options?.applicationOpen ?? since(-10),
      confirmationCapacity: options?.confirmationCapacity ?? null,
      confirmationDeadline: options?.confirmationDeadline ?? since(15),
      displayName: `Portal ${id.slice(0, 6)}`,
      endDate: options?.endDate ?? since(31),
      id,
      name: slug,
      startDate: options?.startDate ?? since(30),
      theme: "Lifecycle",
      timezone: "America/New_York",
    });
    await client.insert(knightHacks.HackathonStatusEmail).values(
      (["pending", "confirmed", "withdrawn"] as const).map((status) => ({
        hackathonId: id,
        status,
        subject: `Application ${status}`,
        templateId,
      })),
    );
    const [applicationAgreement, confirmationAgreement] = await client
      .insert(knightHacks.HackathonAgreementDefinition)
      .values([
        {
          active: true,
          hackathonId: id,
          key: "application-terms",
          legalText: "Application terms",
          required: true,
          stage: "application",
          title: "Application terms",
          version: "1",
        },
        {
          active: true,
          hackathonId: id,
          key: "confirmation-terms",
          legalText: "Confirmation terms",
          required: true,
          stage: "confirmation",
          title: "Confirmation terms",
          version: "1",
        },
      ])
      .returning({
        id: knightHacks.HackathonAgreementDefinition.id,
        stage: knightHacks.HackathonAgreementDefinition.stage,
      });
    const agreements = await client
      .select({
        id: knightHacks.HackathonAgreementDefinition.id,
        stage: knightHacks.HackathonAgreementDefinition.stage,
      })
      .from(knightHacks.HackathonAgreementDefinition)
      .where(eq(knightHacks.HackathonAgreementDefinition.hackathonId, id));
    return {
      applicationAgreementId:
        agreements.find(({ stage }) => stage === "application")?.id ??
        applicationAgreement?.id,
      confirmationAgreementId:
        agreements.find(({ stage }) => stage === "confirmation")?.id ??
        confirmationAgreement?.id,
      id,
    };
  }

  async function participantCaller(userId: string, hackathonId: string) {
    const [mutations, reads] = await Promise.all([
      import("../../hacker-portal/mutations"),
      import("../../hacker-portal/reads"),
    ]);
    const clientRecordId = randomUUID();
    const context = {
      client: {
        clientId: `client-${hackathonId}`,
        enabled: true,
        hackathonId,
        id: clientRecordId,
        origin: "http://localhost:3000",
      },
      headers: new Headers(),
      requestId: randomUUID(),
      session: {
        betterAuthSessionId: `better-auth-${userId}`,
        clientRecordId,
        hackathonId,
        id: randomUUID(),
        userId,
      },
    };
    return {
      confirmAttendance: (
        input: Parameters<typeof mutations.confirmAttendance>[1],
      ) => mutations.confirmAttendance(context, input),
      getApplicationContext: () => reads.getApplicationContext(context),
      getCheckInPass: (input: Parameters<typeof mutations.getCheckInPass>[1]) =>
        mutations.getCheckInPass(context, input),
      getLeaderboard: (input: Parameters<typeof reads.getLeaderboard>[1]) =>
        reads.getLeaderboard(context, input),
      getMyAttendance: () => reads.getMyAttendance(context),
      getMyPoints: () => reads.getMyPoints(context),
      getSchedule: () => reads.getSchedule(context),
      submitApplication: (
        input: Parameters<typeof mutations.submitApplication>[1],
      ) => mutations.submitApplication(context, input),
      updateProfile: (input: Parameters<typeof mutations.updateProfile>[1]) =>
        mutations.updateProfile(context, input),
      updateApplication: (
        input: Parameters<typeof mutations.updateApplication>[1],
      ) => mutations.updateApplication(context, input),
      updateParticipant: (
        input: Parameters<typeof mutations.updateParticipant>[1],
      ) => mutations.updateParticipant(context, input),
      withdrawApplication: (
        input: Parameters<typeof mutations.withdrawApplication>[1],
      ) => mutations.withdrawApplication(context, input),
    };
  }

  function submissionInput(
    label: string,
    agreementId: string,
    options?: { firstTime?: boolean; idempotencyKey?: string },
  ): SubmitApplicationInput {
    return {
      agreements: [{ accepted: true, definitionId: agreementId }],
      firstTime: options?.firstTime ?? false,
      idempotencyKey: options?.idempotencyKey ?? randomUUID(),
      profile: profileInput(label),
      survey1: "I want to build useful things.",
      survey2: "I heard about the event from a friend.",
    };
  }

  async function expectDomainError(request: Promise<unknown>, code: string) {
    await expect(request).rejects.toMatchObject({ cause: { code } });
  }

  async function seedManualApplication(input: {
    classId?: string | null;
    firstName: string;
    hackathonId: string;
    isVip?: boolean;
    lastName: string;
    status: "accepted" | "checkedin" | "confirmed" | "pending";
    userId?: string;
  }) {
    const userId = input.userId ?? (await seedUser(input.firstName));
    const profile = {
      ...profileInput(`${input.firstName}-${randomUUID().slice(0, 6)}`),
      discordUser: `discord-${userId}`,
      firstName: input.firstName,
      lastName: input.lastName,
    };
    const [profileRow] = await client
      .insert(knightHacks.HackerProfile)
      .values({ ...profile, userId })
      .returning({ id: knightHacks.HackerProfile.id });
    if (!profileRow) throw new Error("Failed to seed participant profile.");
    const [revision] = await client
      .insert(knightHacks.HackerProfileRevision)
      .values({
        ...profile,
        createdBy: userId,
        profileId: profileRow.id,
        revision: 1,
      })
      .returning({ id: knightHacks.HackerProfileRevision.id });
    if (!revision) throw new Error("Failed to seed participant revision.");
    const [hacker] = await client
      .insert(knightHacks.Hacker)
      .values({
        ...profile,
        age: 21,
        isFirstTime: false,
        survey1: "fixture",
        survey2: "fixture",
        userId,
      })
      .returning({ id: knightHacks.Hacker.id });
    if (!hacker) throw new Error("Failed to seed compatibility hacker.");
    const [attendee] = await client
      .insert(knightHacks.HackerAttendee)
      .values({
        checkedInAt: input.status === "checkedin" ? new Date() : null,
        classId: input.classId,
        hackerId: hacker.id,
        hackathonId: input.hackathonId,
        isFirstTime: false,
        isVip: input.isVip ?? false,
        profileId: profileRow.id,
        profileRevisionId: revision.id,
        status: input.status,
        survey1: "fixture",
        survey2: "fixture",
      })
      .returning({ id: knightHacks.HackerAttendee.id });
    if (!attendee) throw new Error("Failed to seed participant attendee.");
    return {
      attendeeId: attendee.id,
      hackerId: hacker.id,
      profileId: profileRow.id,
      revisionId: revision.id,
      userId,
    };
  }

  async function seedEvent(
    hackathonId: string,
    name: string,
    startAt: Date,
    points: number,
  ) {
    const [event] = await client
      .insert(knightHacks.Event)
      .values({
        creationKey: randomUUID(),
        creationPayloadHash: "a".repeat(64),
        description: `${name} description`,
        end_datetime: new Date(startAt.getTime() + 60 * 60 * 1_000),
        hackathonId,
        legacy: false,
        location: "Student Union",
        name,
        points,
        start_datetime: startAt,
        tag: "Activity",
      })
      .returning({ id: knightHacks.Event.id });
    if (!event) throw new Error("Failed to seed hackathon event.");
    return event.id;
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_hacker_portal");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;
    // Prevent participant status tests from narrowing mail to officer accounts.
    // This is the same local-only escape hatch used by the Blade E2E suite.
    // eslint-disable-next-line no-restricted-properties
    process.env.BLADE_E2E_AUTH = "true";

    ({ hashOpaqueHackerCheckInPass } =
      await import("../../utils/hackathon-events/check-in"));
    ({ db: client } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");

    const { env } = await import("@forge/db/env");
    expect(env.DATABASE_URL).toBe(disposable.url);

    templateOwnerId = await seedUser("Template Owner");
    templateId = randomUUID();
    await client.insert(knightHacks.EmailTemplate).values({
      createdBy: templateOwnerId,
      domain: "hackathon",
      id: templateId,
      kind: "code",
      name: `Portal lifecycle ${templateId}`,
      normalizedName: `portal lifecycle ${templateId}`,
      updatedBy: templateOwnerId,
    });
    await client.insert(knightHacks.EmailTemplateRevision).values({
      compiledHtml: "<!doctype html><html><body><p>Hello</p></body></html>",
      compiledText: "Hello",
      createdBy: templateOwnerId,
      personalizationContract: [],
      publishedAt: new Date(),
      source:
        'import { Html, Text } from "@react-email/components";\nexport default <Html><Text>Hello</Text></Html>;\n',
      state: "published",
      templateId,
      version: 1,
    });
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("[TC-APP-001/002] reuses one profile while first-time remains per hack", async () => {
    const userId = await seedUser("Returning Hacker");
    const firstHack = await seedHackathon();
    const secondHack = await seedHackathon();
    if (!firstHack.applicationAgreementId || !secondHack.applicationAgreementId)
      throw new Error("Application agreements were not seeded.");

    const firstCaller = await participantCaller(userId, firstHack.id);
    const firstInput = submissionInput(
      "returning-hacker",
      firstHack.applicationAgreementId,
      { firstTime: true },
    );
    firstInput.profile.school = "North Lake Technical Academy";
    await firstCaller.submitApplication(firstInput);

    const secondCaller = await participantCaller(userId, secondHack.id);
    const prefill = await secondCaller.getApplicationContext();
    expect(prefill).toMatchObject({
      agreementAcceptances: [],
      application: null,
      profile: {
        email: firstInput.profile.email,
        firstName: firstInput.profile.firstName,
        revision: 1,
        school: "North Lake Technical Academy",
      },
    });

    await secondCaller.submitApplication({
      ...firstInput,
      agreements: [
        { accepted: true, definitionId: secondHack.applicationAgreementId },
      ],
      firstTime: false,
      idempotencyKey: randomUUID(),
    });

    const [profileCount, revisionCount, attendees] = await Promise.all([
      client
        .select({ value: count(knightHacks.HackerProfile.id) })
        .from(knightHacks.HackerProfile)
        .where(eq(knightHacks.HackerProfile.userId, userId)),
      client
        .select({ value: count(knightHacks.HackerProfileRevision.id) })
        .from(knightHacks.HackerProfileRevision)
        .innerJoin(
          knightHacks.HackerProfile,
          eq(
            knightHacks.HackerProfile.id,
            knightHacks.HackerProfileRevision.profileId,
          ),
        )
        .where(eq(knightHacks.HackerProfile.userId, userId)),
      client
        .select({
          firstTime: knightHacks.HackerAttendee.isFirstTime,
          hackathonId: knightHacks.HackerAttendee.hackathonId,
        })
        .from(knightHacks.HackerAttendee)
        .innerJoin(
          knightHacks.HackerProfile,
          eq(
            knightHacks.HackerProfile.id,
            knightHacks.HackerAttendee.profileId,
          ),
        )
        .where(eq(knightHacks.HackerProfile.userId, userId))
        .orderBy(asc(knightHacks.HackerAttendee.hackathonId)),
    ]);
    expect(profileCount[0]?.value).toBe(1);
    expect(revisionCount[0]?.value).toBe(1);
    expect(
      new Map(attendees.map((row) => [row.hackathonId, row.firstTime])),
    ).toEqual(
      new Map([
        [firstHack.id, true],
        [secondHack.id, false],
      ]),
    );
  });

  it("supports participant self-service when status emails are not configured", async () => {
    const userId = await seedUser("No Status Mail Hacker");
    const hackathon = await seedHackathon();
    if (!hackathon.applicationAgreementId || !hackathon.confirmationAgreementId)
      throw new Error("Lifecycle agreements were not seeded.");

    await client
      .delete(knightHacks.HackathonStatusEmail)
      .where(eq(knightHacks.HackathonStatusEmail.hackathonId, hackathon.id));

    const caller = await participantCaller(userId, hackathon.id);
    const submitted = await caller.submitApplication(
      submissionInput("no-status-mail", hackathon.applicationAgreementId),
    );
    expect(submitted.application).toMatchObject({ status: "pending" });

    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "accepted" })
      .where(eq(knightHacks.HackerAttendee.hackathonId, hackathon.id));
    const confirmed = await caller.confirmAttendance({
      agreements: [
        {
          accepted: true,
          definitionId: hackathon.confirmationAgreementId,
        },
      ],
      idempotencyKey: randomUUID(),
    });
    expect(confirmed.application).toMatchObject({ status: "confirmed" });

    const withdrawn = await caller.withdrawApplication({
      acknowledgement: HACKER_WITHDRAWAL_ACKNOWLEDGEMENT,
      idempotencyKey: randomUUID(),
    });
    expect(withdrawn.application).toMatchObject({ status: "withdrawn" });

    const sends = await client
      .select({ value: count(knightHacks.EmailSend.id) })
      .from(knightHacks.EmailSend)
      .where(eq(knightHacks.EmailSend.createdBy, userId));
    expect(sends[0]?.value).toBe(0);
  });

  it("preserves denied and withdrawn future-hack profile snapshots", async () => {
    const userId = await seedUser("Terminal Snapshot Hacker");
    const activeHack = await seedHackathon();
    const deniedHack = await seedHackathon();
    const withdrawnHack = await seedHackathon();
    if (
      !activeHack.applicationAgreementId ||
      !deniedHack.applicationAgreementId ||
      !withdrawnHack.applicationAgreementId
    ) {
      throw new Error("Application agreements were not seeded.");
    }
    const profile = profileInput("terminal-snapshot");
    const activeCaller = await participantCaller(userId, activeHack.id);
    await activeCaller.submitApplication({
      ...submissionInput(
        "terminal-snapshot",
        activeHack.applicationAgreementId,
      ),
      profile,
    });
    await (
      await participantCaller(userId, deniedHack.id)
    ).submitApplication({
      ...submissionInput(
        "terminal-snapshot",
        deniedHack.applicationAgreementId,
      ),
      profile,
    });
    await (
      await participantCaller(userId, withdrawnHack.id)
    ).submitApplication({
      ...submissionInput(
        "terminal-snapshot",
        withdrawnHack.applicationAgreementId,
      ),
      profile,
    });

    const before = await client
      .select({
        hackathonId: knightHacks.HackerAttendee.hackathonId,
        id: knightHacks.HackerAttendee.id,
        profileRevisionId: knightHacks.HackerAttendee.profileRevisionId,
      })
      .from(knightHacks.HackerAttendee)
      .innerJoin(
        knightHacks.HackerProfile,
        eq(knightHacks.HackerProfile.id, knightHacks.HackerAttendee.profileId),
      )
      .where(eq(knightHacks.HackerProfile.userId, userId));
    const beforeByHack = new Map(before.map((row) => [row.hackathonId, row]));
    const deniedAttendee = beforeByHack.get(deniedHack.id);
    const withdrawnAttendee = beforeByHack.get(withdrawnHack.id);
    if (!deniedAttendee || !withdrawnAttendee) {
      throw new Error("Terminal attendee snapshots were not seeded.");
    }
    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "denied" })
      .where(eq(knightHacks.HackerAttendee.id, deniedAttendee.id));
    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "withdrawn" })
      .where(eq(knightHacks.HackerAttendee.id, withdrawnAttendee.id));

    await activeCaller.updateProfile({
      expectedRevision: 1,
      idempotencyKey: randomUUID(),
      profile: { firstName: "Updated Snapshot" },
    });

    const after = await client
      .select({
        hackathonId: knightHacks.HackerAttendee.hackathonId,
        profileRevisionId: knightHacks.HackerAttendee.profileRevisionId,
      })
      .from(knightHacks.HackerAttendee)
      .innerJoin(
        knightHacks.HackerProfile,
        eq(knightHacks.HackerProfile.id, knightHacks.HackerAttendee.profileId),
      )
      .where(eq(knightHacks.HackerProfile.userId, userId));
    const afterByHack = new Map(after.map((row) => [row.hackathonId, row]));
    expect(afterByHack.get(activeHack.id)?.profileRevisionId).not.toBe(
      beforeByHack.get(activeHack.id)?.profileRevisionId,
    );
    expect(afterByHack.get(deniedHack.id)?.profileRevisionId).toBe(
      beforeByHack.get(deniedHack.id)?.profileRevisionId,
    );
    expect(afterByHack.get(withdrawnHack.id)?.profileRevisionId).toBe(
      beforeByHack.get(withdrawnHack.id)?.profileRevisionId,
    );
  });

  it("[TC-APP-003] records exact concurrent retries and rejects key reuse with different input", async () => {
    const userId = await seedUser("Idempotent Hacker");
    const hackathon = await seedHackathon();
    if (!hackathon.applicationAgreementId)
      throw new Error("Application agreement was not seeded.");
    const caller = await participantCaller(userId, hackathon.id);
    const input = submissionInput(
      "idempotent-hacker",
      hackathon.applicationAgreementId,
      { idempotencyKey: "same-submission" },
    );

    const [left, right] = await Promise.all([
      caller.submitApplication(input),
      caller.submitApplication(input),
    ]);
    expect(right).toEqual(left);

    await expectDomainError(
      caller.submitApplication({
        ...input,
        firstTime: !input.firstTime,
      }),
      "CONFLICT",
    );
    const [attendeeCount, commandCount] = await Promise.all([
      client
        .select({ value: count(knightHacks.HackerAttendee.id) })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.hackathonId, hackathon.id)),
      client
        .select({ value: count(knightHacks.HackerParticipantCommand.id) })
        .from(knightHacks.HackerParticipantCommand)
        .where(
          and(
            eq(knightHacks.HackerParticipantCommand.userId, userId),
            eq(knightHacks.HackerParticipantCommand.hackathonId, hackathon.id),
            eq(
              knightHacks.HackerParticipantCommand.operation,
              "submit_application",
            ),
          ),
        ),
    ]);
    expect(attendeeCount[0]?.value).toBe(1);
    expect(commandCount[0]?.value).toBe(1);
  });

  it("[TC-APP-004/007] enforces the database application window and start lock", async () => {
    const beforeOpen = await seedHackathon({
      applicationDeadline: since(3),
      applicationOpen: since(2),
      startDate: since(4),
    });
    const open = await seedHackathon();
    const afterDeadline = await seedHackathon({
      applicationDeadline: since(-1),
      applicationOpen: since(-10),
      startDate: since(5),
    });
    const started = await seedHackathon({
      applicationDeadline: since(2),
      applicationOpen: since(-10),
      startDate: since(-1),
    });
    const attempts = [beforeOpen, open, afterDeadline, started];
    for (const [index, hackathon] of attempts.entries()) {
      if (!hackathon.applicationAgreementId)
        throw new Error("Application agreement was not seeded.");
      const userId = await seedUser(`Window Hacker ${index}`);
      const caller = await participantCaller(userId, hackathon.id);
      const request = caller.submitApplication(
        submissionInput(
          `window-hacker-${index}`,
          hackathon.applicationAgreementId,
        ),
      );
      if (hackathon.id === open.id)
        await expect(request).resolves.toBeDefined();
      else await expectDomainError(request, "APPLICATION_CLOSED");
    }

    const [openAttendee] = await client
      .select({
        id: knightHacks.HackerAttendee.id,
        survey1: knightHacks.HackerAttendee.survey1,
      })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.hackathonId, open.id));
    if (!openAttendee) throw new Error("Open application was not recorded.");
    await client
      .update(knightHacks.Hackathon)
      .set({ startDate: since(-1) })
      .where(eq(knightHacks.Hackathon.id, open.id));
    const [openProfile] = await client
      .select({ userId: knightHacks.HackerProfile.userId })
      .from(knightHacks.HackerProfile)
      .innerJoin(
        knightHacks.HackerAttendee,
        eq(knightHacks.HackerAttendee.profileId, knightHacks.HackerProfile.id),
      )
      .where(eq(knightHacks.HackerAttendee.id, openAttendee.id));
    if (!openProfile) throw new Error("Open profile was not recorded.");
    const openCaller = await participantCaller(openProfile.userId, open.id);
    await expectDomainError(
      openCaller.updateApplication({
        idempotencyKey: randomUUID(),
        survey1: "This must not commit after start.",
      }),
      "APPLICATION_LOCKED",
    );
    const [unchanged] = await client
      .select({ survey1: knightHacks.HackerAttendee.survey1 })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, openAttendee.id));
    expect(unchanged?.survey1).toBe(openAttendee.survey1);
  });

  it("atomically rolls back hackathon answers when a composite profile edit is stale", async () => {
    const userId = await seedUser("Atomic Profile Hacker");
    const hackathon = await seedHackathon();
    if (!hackathon.applicationAgreementId) {
      throw new Error("Application agreement was not seeded.");
    }
    const caller = await participantCaller(userId, hackathon.id);
    await caller.submitApplication(
      submissionInput("atomic-profile", hackathon.applicationAgreementId),
    );

    await expectDomainError(
      caller.updateParticipant({
        expectedRevision: 999,
        firstTime: true,
        idempotencyKey: randomUUID(),
        profile: { firstName: "Must Roll Back" },
        survey1: "This answer must roll back too.",
      }),
      "STALE_PROFILE_REVISION",
    );

    const context = await caller.getApplicationContext();
    expect(context.profile?.firstName).toBe("atomic-profile");
    expect(context.application?.survey1).toBe("I want to build useful things.");
    expect(context.application?.firstTime).toBe(false);

    const agreementOnly = await caller.updateParticipant({
      agreements: [
        { accepted: true, definitionId: hackathon.applicationAgreementId },
      ],
      expectedRevision: context.profile?.revision ?? 1,
      idempotencyKey: randomUUID(),
      profile: {},
    });
    expect(agreementOnly.profile?.revision).toBe(context.profile?.revision);
    expect(agreementOnly.application?.survey1).toBe(
      "I want to build useful things.",
    );
  });

  it("[TC-LIFE-001/003] confirms accepted hackers only and serializes the final capacity slot", async () => {
    const hackathon = await seedHackathon({ confirmationCapacity: 1 });
    if (!hackathon.applicationAgreementId || !hackathon.confirmationAgreementId)
      throw new Error("Lifecycle agreements were not seeded.");
    const applicationAgreementId = hackathon.applicationAgreementId;
    const confirmationAgreementId = hackathon.confirmationAgreementId;
    const userIds = await Promise.all([
      seedUser("Capacity One"),
      seedUser("Capacity Two"),
    ]);
    const callers = await Promise.all(
      userIds.map((userId) => participantCaller(userId, hackathon.id)),
    );
    await Promise.all(
      callers.map((caller, index) =>
        caller.submitApplication(
          submissionInput(`capacity-${index}`, applicationAgreementId),
        ),
      ),
    );

    const pendingCaller = callers[0];
    if (!pendingCaller) throw new Error("Pending caller was not seeded.");
    await expectDomainError(
      pendingCaller.confirmAttendance({
        agreements: [
          {
            accepted: true,
            definitionId: confirmationAgreementId,
          },
        ],
        idempotencyKey: "pending-cannot-confirm",
      }),
      "FORBIDDEN_STATUS",
    );
    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "accepted" })
      .where(eq(knightHacks.HackerAttendee.hackathonId, hackathon.id));

    const inputs = userIds.map((_, index) => ({
      agreements: [
        {
          accepted: true,
          definitionId: confirmationAgreementId,
        },
      ],
      idempotencyKey: `capacity-confirm-${index}`,
    }));
    const results = await Promise.allSettled(
      callers.map((caller, index) => {
        const input = inputs[index];
        if (!input) throw new Error("Confirmation input was not seeded.");
        return caller.confirmAttendance(input);
      }),
    );
    const fulfilled = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<(typeof callers)[number]["confirmAttendance"]>>
      > => result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejection: unknown = rejected[0]?.reason;
    expect(rejection).toMatchObject({
      cause: { code: "CAPACITY_REACHED" },
    });

    const [confirmed] = await client
      .select({
        lastStatusSendId: knightHacks.HackerAttendee.lastStatusSendId,
        status: knightHacks.HackerAttendee.status,
        timeConfirmed: knightHacks.HackerAttendee.timeConfirmed,
      })
      .from(knightHacks.HackerAttendee)
      .where(
        and(
          eq(knightHacks.HackerAttendee.hackathonId, hackathon.id),
          eq(knightHacks.HackerAttendee.status, "confirmed"),
        ),
      );
    expect(confirmed?.status).toBe("confirmed");
    expect(typeof confirmed?.lastStatusSendId).toBe("string");
    expect(confirmed?.timeConfirmed).toBeInstanceOf(Date);

    const winnerIndex = results.findIndex(
      (result) => result.status === "fulfilled",
    );
    const winnerCaller = callers[winnerIndex];
    const winnerInput = inputs[winnerIndex];
    if (!winnerCaller || !winnerInput)
      throw new Error("Capacity winner was not resolved.");
    await expect(winnerCaller.confirmAttendance(winnerInput)).resolves.toEqual(
      fulfilled[0]?.value,
    );
  });

  it("[TC-LIFE-004/005] makes withdrawal terminal and revokes the active pass", async () => {
    const hackathon = await seedHackathon();
    if (!hackathon.applicationAgreementId)
      throw new Error("Application agreement was not seeded.");
    const userId = await seedUser("Withdrawing Hacker");
    const caller = await participantCaller(userId, hackathon.id);
    await caller.submitApplication(
      submissionInput("withdrawing-hacker", hackathon.applicationAgreementId),
    );
    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "confirmed" })
      .where(eq(knightHacks.HackerAttendee.hackathonId, hackathon.id));
    await caller.getCheckInPass({ idempotencyKey: "withdraw-pass" });

    const withdrawal = {
      acknowledgement: HACKER_WITHDRAWAL_ACKNOWLEDGEMENT,
      idempotencyKey: "withdraw-once",
    } as const;
    const first = await caller.withdrawApplication(withdrawal);
    await expect(caller.withdrawApplication(withdrawal)).resolves.toEqual(
      first,
    );
    await expectDomainError(
      caller.withdrawApplication({
        ...withdrawal,
        idempotencyKey: "withdraw-again",
      }),
      "FORBIDDEN_STATUS",
    );

    const [application, pass] = await Promise.all([
      client
        .select({
          lastStatusSendId: knightHacks.HackerAttendee.lastStatusSendId,
          status: knightHacks.HackerAttendee.status,
        })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.hackathonId, hackathon.id)),
      client
        .select({ revokedAt: knightHacks.HackerCheckInPass.revokedAt })
        .from(knightHacks.HackerCheckInPass)
        .where(eq(knightHacks.HackerCheckInPass.hackathonId, hackathon.id)),
    ]);
    expect(application[0]?.status).toBe("withdrawn");
    expect(typeof application[0]?.lastStatusSendId).toBe("string");
    expect(pass[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it("replays a QR pass without storing plaintext and expires its command record", async () => {
    const hackathon = await seedHackathon();
    const participant = await seedManualApplication({
      firstName: "Opaque",
      hackathonId: hackathon.id,
      lastName: "Pass",
      status: "confirmed",
    });
    const caller = await participantCaller(participant.userId, hackathon.id);
    const idempotencyKey = "opaque-pass-replay";

    const first = await caller.getCheckInPass({ idempotencyKey });
    const replay = await caller.getCheckInPass({ idempotencyKey });
    expect(replay).toEqual(first);

    const [command] = await client
      .select({
        id: knightHacks.HackerParticipantCommand.id,
        result: knightHacks.HackerParticipantCommand.result,
      })
      .from(knightHacks.HackerParticipantCommand)
      .where(
        and(
          eq(knightHacks.HackerParticipantCommand.userId, participant.userId),
          eq(knightHacks.HackerParticipantCommand.hackathonId, hackathon.id),
          eq(
            knightHacks.HackerParticipantCommand.operation,
            "issue_check_in_pass",
          ),
          eq(
            knightHacks.HackerParticipantCommand.idempotencyKey,
            idempotencyKey,
          ),
        ),
      );
    expect(command?.result).toEqual({ expiresAt: null, version: 1 });
    expect(JSON.stringify(command?.result)).not.toContain(first.payload);

    const [pass] = await client
      .select({ tokenHash: knightHacks.HackerCheckInPass.tokenHash })
      .from(knightHacks.HackerCheckInPass)
      .where(eq(knightHacks.HackerCheckInPass.hackathonId, hackathon.id));
    expect(pass?.tokenHash).toBe(hashOpaqueHackerCheckInPass(first.payload));

    if (!command) throw new Error("Pass command was not stored.");
    await client
      .update(knightHacks.HackerParticipantCommand)
      .set({ expiresAt: since(-1) })
      .where(eq(knightHacks.HackerParticipantCommand.id, command.id));

    // Expiry is enforced by the command path even before the hourly cleanup
    // runs, so a stale record cannot replay indefinitely.
    const afterExpiry = await caller.getCheckInPass({ idempotencyKey });
    expect(afterExpiry.payload).not.toBe(first.payload);
    const [reclaimed] = await client
      .select({ id: knightHacks.HackerParticipantCommand.id })
      .from(knightHacks.HackerParticipantCommand)
      .where(
        and(
          eq(knightHacks.HackerParticipantCommand.userId, participant.userId),
          eq(knightHacks.HackerParticipantCommand.hackathonId, hackathon.id),
          eq(
            knightHacks.HackerParticipantCommand.operation,
            "issue_check_in_pass",
          ),
          eq(
            knightHacks.HackerParticipantCommand.idempotencyKey,
            idempotencyKey,
          ),
        ),
      );
    expect(reclaimed?.id).not.toBe(command.id);
    if (!reclaimed) throw new Error("Expired pass command was not reclaimed.");
    await client
      .update(knightHacks.HackerParticipantCommand)
      .set({ expiresAt: since(-1) })
      .where(eq(knightHacks.HackerParticipantCommand.id, reclaimed.id));

    await caller.getCheckInPass({ idempotencyKey: "unexpired-pass-command" });
    const { cleanupExpiredHackerParticipantCommands } =
      await import("../../utils/hacker-portal/command-cleanup");
    await expect(
      cleanupExpiredHackerParticipantCommands({ now: new Date() }),
    ).resolves.toEqual({ deleted: 1 });

    const [expiredCount, preservedCount] = await Promise.all([
      client
        .select({ value: count(knightHacks.HackerParticipantCommand.id) })
        .from(knightHacks.HackerParticipantCommand)
        .where(
          and(
            eq(knightHacks.HackerParticipantCommand.userId, participant.userId),
            eq(knightHacks.HackerParticipantCommand.hackathonId, hackathon.id),
            eq(
              knightHacks.HackerParticipantCommand.operation,
              "issue_check_in_pass",
            ),
            eq(
              knightHacks.HackerParticipantCommand.idempotencyKey,
              idempotencyKey,
            ),
          ),
        ),
      client
        .select({ value: count(knightHacks.HackerParticipantCommand.id) })
        .from(knightHacks.HackerParticipantCommand)
        .where(
          and(
            eq(knightHacks.HackerParticipantCommand.userId, participant.userId),
            eq(knightHacks.HackerParticipantCommand.hackathonId, hackathon.id),
            eq(
              knightHacks.HackerParticipantCommand.operation,
              "issue_check_in_pass",
            ),
            eq(
              knightHacks.HackerParticipantCommand.idempotencyKey,
              "unexpired-pass-command",
            ),
          ),
        ),
    ]);
    expect(expiredCount[0]?.value).toBe(0);
    expect(preservedCount[0]?.value).toBe(1);
  });

  it("[TC-DASH-001/002] hides Forge schedule data until whole-hack check-in", async () => {
    const hackathon = await seedHackathon();
    const applications = await Promise.all(
      (["pending", "accepted", "confirmed", "checkedin"] as const).map(
        (status) =>
          seedManualApplication({
            firstName: status,
            hackathonId: hackathon.id,
            lastName: "Schedule",
            status,
          }),
      ),
    );
    const late = await seedEvent(
      hackathon.id,
      "Late workshop",
      since(30.5),
      20,
    );
    const early = await seedEvent(hackathon.id, "Opening", since(30.25), 0);

    for (const participant of applications.slice(0, 3)) {
      const caller = await participantCaller(participant.userId, hackathon.id);
      await expectDomainError(caller.getSchedule(), "FORBIDDEN_STATUS");
    }
    const checkedIn = applications[3];
    if (!checkedIn) throw new Error("Checked-in participant was not seeded.");
    const checkedInCaller = await participantCaller(
      checkedIn.userId,
      hackathon.id,
    );
    const schedule = await checkedInCaller.getSchedule();
    expect(schedule.events.map(({ id }) => id)).toEqual([early, late]);
    expect(schedule.events[0]).toMatchObject({
      description: "Opening description",
      id: early,
      location: "Student Union",
      name: "Opening",
      points: 0,
      purpose: "event",
      tag: "Activity",
    });
    expect(typeof schedule.events[0]?.startAt).toBe("string");
    expect(typeof schedule.events[0]?.endAt).toBe("string");
    expect(JSON.stringify(schedule)).not.toMatch(
      /discordId|googleId|publishedAt|syncState|operator/i,
    );
  });

  it("[TC-DASH-003/004] includes repeats in history but isolates event-award points", async () => {
    const hackathon = await seedHackathon();
    const participant = await seedManualApplication({
      firstName: "Points",
      hackathonId: hackathon.id,
      lastName: "Hacker",
      status: "checkedin",
    });
    await client
      .update(knightHacks.HackerAttendee)
      .set({ points: 9_999 })
      .where(eq(knightHacks.HackerAttendee.id, participant.attendeeId));
    const eventId = await seedEvent(hackathon.id, "Lunch", since(30.2), 500);
    await client.insert(knightHacks.HackerEventAttendee).values([
      {
        checkedInAt: since(30.2),
        eventId,
        hackerAttId: participant.attendeeId,
        hackathonId: hackathon.id,
        isInitialAttendance: true,
        pointsAwarded: 25,
      },
      {
        checkedInAt: since(30.3),
        eventId,
        hackerAttId: participant.attendeeId,
        hackathonId: hackathon.id,
        isInitialAttendance: false,
        pointsAwarded: 0,
      },
      {
        checkedInAt: since(30.4),
        eventId,
        hackerAttId: participant.attendeeId,
        hackathonId: hackathon.id,
        isInitialAttendance: true,
        pointsAwarded: 900,
        voidReason: "Operator correction",
        voidedAt: since(30.5),
      },
    ]);

    const otherHack = await seedHackathon();
    const otherHacker = await client
      .insert(knightHacks.Hacker)
      .values({
        ...profileInput(`other-${randomUUID().slice(0, 6)}`),
        age: 21,
        discordUser: `discord-${participant.userId}`,
        isFirstTime: false,
        survey1: "fixture",
        survey2: "fixture",
        userId: participant.userId,
      })
      .returning({ id: knightHacks.Hacker.id });
    const otherHackerRow = otherHacker[0];
    if (!otherHackerRow) throw new Error("Other hacker was not seeded.");
    const [otherAttendee] = await client
      .insert(knightHacks.HackerAttendee)
      .values({
        hackerId: otherHackerRow.id,
        hackathonId: otherHack.id,
        profileId: participant.profileId,
        profileRevisionId: participant.revisionId,
        status: "checkedin",
      })
      .returning({ id: knightHacks.HackerAttendee.id });
    if (!otherAttendee) throw new Error("Other attendee was not seeded.");
    const otherEventId = await seedEvent(
      otherHack.id,
      "Other hack",
      since(30.2),
      700,
    );
    await client.insert(knightHacks.HackerEventAttendee).values({
      checkedInAt: since(30.2),
      eventId: otherEventId,
      hackerAttId: otherAttendee.id,
      hackathonId: otherHack.id,
      isInitialAttendance: true,
      pointsAwarded: 700,
    });

    const caller = await participantCaller(participant.userId, hackathon.id);
    const [attendance, points] = await Promise.all([
      caller.getMyAttendance(),
      caller.getMyPoints(),
    ]);
    expect(attendance.occurrences).toHaveLength(2);
    expect(
      attendance.occurrences.map(
        ({ isInitialAttendance }) => isInitialAttendance,
      ),
    ).toEqual([true, false]);
    expect(
      attendance.occurrences.map(({ pointsAwarded }) => pointsAwarded),
    ).toEqual([25, 0]);
    expect(points).toMatchObject({ total: 25 });
    expect(points.entries).toHaveLength(1);
    expect(points.entries[0]).toMatchObject({ eventId, points: 25 });
  });

  it("[TC-DASH-005/006] ranks overall and arbitrary classes without exposing identity", async () => {
    const hackathon = await seedHackathon();
    const classA = randomUUID();
    const classB = randomUUID();
    await client.insert(knightHacks.HackathonClass).values([
      {
        color: "#112233",
        discordRoleId: "990000000000000101",
        hackathonId: hackathon.id,
        id: classA,
        kind: "class",
        name: "Alpha",
      },
      {
        color: "#445566",
        discordRoleId: "990000000000000102",
        hackathonId: hackathon.id,
        id: classB,
        kind: "class",
        name: "Beta",
      },
    ]);
    const viewer = await seedManualApplication({
      firstName: "Confirmed",
      hackathonId: hackathon.id,
      lastName: "Viewer",
      status: "confirmed",
    });
    const ranked = await Promise.all([
      seedManualApplication({
        classId: classA,
        firstName: "Alice",
        hackathonId: hackathon.id,
        lastName: "Archer",
        status: "checkedin",
      }),
      seedManualApplication({
        classId: classA,
        firstName: "Bob",
        hackathonId: hackathon.id,
        isVip: true,
        lastName: "Builder",
        status: "checkedin",
      }),
      seedManualApplication({
        classId: classA,
        firstName: "Cara",
        hackathonId: hackathon.id,
        lastName: "Coder",
        status: "checkedin",
      }),
      seedManualApplication({
        classId: classB,
        firstName: "Dora",
        hackathonId: hackathon.id,
        lastName: "Designer",
        status: "checkedin",
      }),
    ]);
    const awards = [100, 100, 75, 200];
    for (const [index, participant] of ranked.entries()) {
      const award = awards[index];
      if (award === undefined)
        throw new Error("Leaderboard award was missing.");
      const eventId = await seedEvent(
        hackathon.id,
        `Leaderboard ${index}`,
        since(30 + index / 10),
        award,
      );
      await client.insert(knightHacks.HackerEventAttendee).values({
        checkedInAt: since(30 + index / 10),
        eventId,
        hackerAttId: participant.attendeeId,
        hackathonId: hackathon.id,
        isInitialAttendance: true,
        pointsAwarded: award,
      });
    }

    const viewerCaller = await participantCaller(viewer.userId, hackathon.id);
    const classBoard = await viewerCaller.getLeaderboard({
      classId: classA,
      scope: "class",
    });
    expect(classBoard.viewerRank).toBeNull();
    expect(
      classBoard.rows.map(({ displayName, points, rank }) => ({
        displayName,
        points,
        rank,
      })),
    ).toEqual([
      { displayName: "Alice A.", points: 100, rank: 1 },
      { displayName: "Bob B.", points: 100, rank: 1 },
      { displayName: "Cara C.", points: 75, rank: 3 },
    ]);

    const alice = ranked[0];
    const aliceCaller = await participantCaller(alice.userId, hackathon.id);
    const overall = await aliceCaller.getLeaderboard({ scope: "overall" });
    expect(overall.rows.filter(({ isCurrentUser }) => isCurrentUser)).toEqual([
      expect.objectContaining({ displayName: "Alice A.", points: 100 }),
    ]);
    expect(overall.viewerRank).toBe(2);
    expect(JSON.stringify(overall)).not.toMatch(
      new RegExp(
        ranked
          .map(({ attendeeId, profileId, userId }) =>
            [attendeeId, profileId, userId].join("|"),
          )
          .join("|"),
      ),
    );
  });
});
