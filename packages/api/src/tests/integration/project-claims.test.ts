import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { db } from "@forge/db/client";
import type * as Schema from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, eq, sql } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

vi.mock("@forge/email", async (original) => ({
  ...(await original<typeof import("@forge/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

function required<T>(value: T | null | undefined): T {
  assert(value != null);
  return value;
}

describe.skipIf(!canRunDatabaseTests())("project claims", () => {
  let client: typeof db;
  let schema: typeof Schema;
  let database: DisposableDatabase;
  let claims: typeof import("../../utils/project-claims/claims");
  let reads: typeof import("../../utils/project-claims/itinerary");
  let event: string;
  let otherEvent: string;
  let users: string[];
  let project: string;
  let members: string[];

  async function seedEvent() {
    const id = randomUUID();
    await client.insert(schema.Hackathon).values({
      id,
      name: `claim-${id}`,
      displayName: "Claim test event",
      theme: "Test",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2099-01-01"),
      applicationOpen: new Date("2025-01-01"),
      applicationDeadline: new Date("2025-12-01"),
      confirmationDeadline: new Date("2025-12-31"),
      timezone: "America/New_York",
    });
    await client.insert(schema.HackathonJudgingConfiguration).values({
      hackathonId: id,
      projectClaimUrl: "https://portal.example/dashboard/judging",
    });
    return id;
  }
  async function seedUser(index: number, checkedIn: boolean) {
    const { User } = await import("@forge/db/schemas/auth");
    const id = randomUUID();
    await client.insert(User).values({
      id,
      name: `Hacker ${index}`,
      discordUserId: `1234567890123456${index.toString().padStart(2, "0")}`,
    });
    const fields = {
      firstName: `Hacker${index}`,
      lastName: "Tester",
      gender: "Prefer not to answer" as const,
      raceOrEthnicity: "Prefer not to answer" as const,
      country: "United States of America" as const,
      email: `hacker${index}@example.test`,
      phoneNumber: `407555${index.toString().padStart(4, "0")}`,
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      major: "Computer Science" as const,
      shirtSize: "M" as const,
      discordUser: `hacker${index}`,
      dob: "2005-01-01",
      gradDate: "2028-05-01",
    };
    const profileId = randomUUID(),
      revisionId = randomUUID(),
      hackerId = randomUUID();
    await client
      .insert(schema.HackerProfile)
      .values({ id: profileId, userId: id, ...fields });
    await client
      .insert(schema.HackerProfileRevision)
      .values({ id: revisionId, profileId, revision: 1, ...fields });
    await client.insert(schema.Hacker).values({
      id: hackerId,
      userId: id,
      age: 21,
      survey1: "Test",
      survey2: "Test",
      ...fields,
    });
    for (const hackathonId of [event, otherEvent])
      await client.insert(schema.HackerAttendee).values({
        hackerId,
        hackathonId,
        profileId,
        profileRevisionId: revisionId,
        status: checkedIn ? "checkedin" : "confirmed",
        checkedInAt: checkedIn ? new Date() : null,
      });
    return id;
  }
  async function seedProject(hackathonId: string, count: number) {
    const id = randomUUID();
    await client.insert(schema.Project).values({
      id,
      hackathonId,
      title: "Signal Garden",
      submissionUrl: `https://devpost.com/software/${id}`,
      description: "A useful project",
      participantCount: count,
      projectCreatedAt: new Date(),
      submittedAt: new Date(),
    });
    const ids = Array.from({ length: count }, () => randomUUID());
    await client.insert(schema.ProjectMember).values(
      ids.map((memberId, index) => ({
        id: memberId,
        projectId: id,
        name: `Imported ${index}`,
        email: `devpost-${index}-${id}@example.test`,
        displayOrder: index,
      })),
    );
    return { id, members: ids };
  }

  beforeAll(async () => {
    database = await provisionDisposableDatabase("forge_project_claims");
    vi.stubEnv("DATABASE_URL", database.url);
    ({ db: client } = await import("@forge/db/client"));
    schema = await import("@forge/db/schemas/knight-hacks");
    claims = await import("../../utils/project-claims/claims");
    reads = await import("../../utils/project-claims/itinerary");
  }, 120_000);
  beforeEach(async () => {
    const { User } = await import("@forge/db/schemas/auth");
    await client.execute(sql`TRUNCATE ${schema.Hackathon}, ${User} CASCADE`);
    event = await seedEvent();
    otherEvent = await seedEvent();
    users = [];
    for (let i = 0; i < 7; i++) users.push(await seedUser(i, i !== 6));
    const seeded = await seedProject(event, 3);
    project = seeded.id;
    members = seeded.members;
  }, 30_000);
  async function seedClaim() {
    const link = await claims.prepareClaimLink(event, required(members[0]));
    await claims.selectProjectMember(required(users[0]), event, {
      token: required(link.token),
      memberId: required(members[1]),
    });
  }
  afterAll(async () => {
    await client.$client.end();
    await database.drop();
    vi.unstubAllEnvs();
  }, 30_000);

  it("TC-001/010/014: previews do not consume; checked-in account selects any imported member once", async () => {
    const link = await claims.prepareClaimLink(event, required(members[0]));
    const otherRecipientLink = await claims.prepareClaimLink(
      event,
      required(members[1]),
    );
    expect(
      (await reads.hackerJudging(required(users[0]), event)).claimsOpen,
    ).toBe(false);
    expect(link.token).toBeTruthy();
    await expect(
      claims.previewProjectClaim(
        required(users[6]),
        event,
        required(link.token),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const preview = await claims.previewProjectClaim(
      required(users[0]),
      event,
      required(link.token),
    );
    expect(preview.members).toHaveLength(3);
    expect(
      (await claims.prepareClaimLink(event, required(members[0]))).token,
    ).toBe(link.token);
    await expect(
      claims.selectProjectMember(required(users[0]), event, {
        token: required(link.token),
        memberId: required(members[1]),
      }),
    ).resolves.toEqual({ projectId: project });
    await expect(
      claims.previewProjectClaim(
        required(users[1]),
        event,
        required(link.token),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      (await claims.prepareClaimLink(event, required(members[1]))).token,
    ).toBe(otherRecipientLink.token);
    const [stored] = await client
      .select()
      .from(schema.ProjectClaimLink)
      .where(eq(schema.ProjectClaimLink.id, link.id));
    expect(stored?.token).toBeNull();
    expect(stored?.consumedByUserId).toBe(users[0]);
    expect((await claims.projectRoster(project))[1]?.discordUserId).toBe(
      "123456789012345600",
    );
  });
  it("TC-008/017: invitation occupies the fourth slot; retry and acceptance never add another", async () => {
    await seedClaim();
    expect(
      await claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker2@example.test",
      ),
    ).toMatchObject({ sent: true });
    expect(
      (await reads.hackerJudging(required(users[0]), event)).claimsOpen,
    ).toBe(true);
    expect(
      (await reads.hackerJudging(required(users[0]), otherEvent)).claimsOpen,
    ).toBe(false);
    expect(
      await claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker2@example.test",
      ),
    ).toMatchObject({ sent: true });
    await expect(
      claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker3@example.test",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const roster = await claims.projectRoster(project);
    expect(roster).toHaveLength(4);
    const invited = required(
      roster.find((member) => member.invitedUserId === users[2]),
    );
    const link = await claims.prepareClaimLink(event, invited.id);
    await expect(
      claims.selectProjectMember(required(users[3]), event, {
        token: required(link.token),
        memberId: invited.id,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await claims.selectProjectMember(required(users[2]), event, {
      token: required(link.token),
      memberId: invited.id,
    });
    expect(await claims.projectRoster(project)).toHaveLength(4);
    const another = await claims.prepareClaimLink(event, required(members[2]));
    await expect(
      claims.selectProjectMember(required(users[0]), event, {
        token: required(another.token),
        memberId: required(members[2]),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("TC-NEG-002: simultaneous claims have exactly one winner", async () => {
    const seeded = await seedProject(event, 1),
      link = await claims.prepareClaimLink(event, required(seeded.members[0]));
    const results = await Promise.allSettled(
      [required(users[4]), required(users[5])].map((userId) =>
        claims.selectProjectMember(userId, event, {
          token: required(link.token),
          memberId: required(seeded.members[0]),
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
  });
  it("TC-007/015/016: event isolation, unpublished emergency, restored claims", async () => {
    await seedClaim();
    const own = await reads.hackerJudging(required(users[0]), event);
    expect(own.project?.id).toBe(project);
    expect(own.appointments).toEqual([]);
    await expect(
      reads.hackerJudging(required(users[1]), event, project),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerScheduleEmergency: true })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    await expect(
      reads.searchJudgingProjects(required(users[1]), event, ""),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      (await reads.hackerJudging(required(users[0]), event, project)).project,
    ).toBeNull();
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerSchedulePublished: true })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    expect(
      (await reads.searchJudgingProjects(required(users[1]), event, "Signal"))
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await reads.hackerJudging(required(users[1]), event, project)).feedback,
    ).toEqual([]);
    expect(
      (await reads.hackerJudging(required(users[0]), otherEvent)).project,
    ).toBeNull();
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerScheduleEmergency: false })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    expect(
      (await reads.hackerJudging(required(users[0]), event)).project?.id,
    ).toBe(project);
    const second = await seedProject(otherEvent, 1),
      link = await claims.prepareClaimLink(
        otherEvent,
        required(second.members[0]),
      );
    await expect(
      claims.previewProjectClaim(
        required(users[0]),
        event,
        required(link.token),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await claims.selectProjectMember(required(users[0]), otherEvent, {
      token: required(link.token),
      memberId: required(second.members[0]),
    });
  });
  it("TC-004/015: completed authenticated feedback is anonymous and disappears in emergency mode", async () => {
    await seedClaim();
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerSchedulePublished: true })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    const challengeId = randomUUID(),
      judgeId = randomUUID(),
      guestId = randomUUID(),
      incompleteJudge = randomUUID();
    const ratingId = randomUUID(),
      responseId = randomUUID();
    await client.insert(schema.ProjectChallenge).values({
      id: challengeId,
      hackathonId: event,
      label: "General",
      isGroup: true,
      isGeneral: true,
    });
    await client.insert(schema.ProjectToChallenge).values({
      projectId: project,
      challengeId,
      hackathonId: event,
      isOptIn: true,
    });
    await client.insert(schema.Judge).values([
      {
        id: judgeId,
        hackathonId: event,
        kind: "member",
        userId: required(users[0]),
        displayName: "Never reveal this judge",
      },
      {
        id: guestId,
        hackathonId: event,
        kind: "guest",
        displayName: "Guest secret",
      },
      {
        id: incompleteJudge,
        hackathonId: event,
        kind: "member",
        userId: required(users[3]),
        displayName: "Incomplete judge",
      },
    ]);
    await client.insert(schema.JudgingRubricItem).values([
      {
        id: ratingId,
        hackathonId: event,
        kind: "rating",
        label: "Technical execution",
        displayOrder: 0,
      },
      {
        id: responseId,
        hackathonId: event,
        kind: "short_response",
        label: "Feedback",
        displayOrder: 1,
        memberVisibilityPolicy: "public",
        guestVisibilityPolicy: "public",
      },
    ]);
    for (const [index, id] of [judgeId, guestId, incompleteJudge].entries()) {
      const evaluationId = randomUUID();
      await client.insert(schema.ProjectEvaluation).values({
        id: evaluationId,
        hackathonId: event,
        projectId: project,
        challengeId,
        judgeId: id,
        isComplete: index !== 2,
      });
      await client.insert(schema.ProjectEvaluationRating).values({
        evaluationId,
        hackathonId: event,
        rubricItemId: ratingId,
        value: 4,
      });
      await client.insert(schema.ProjectEvaluationResponse).values({
        evaluationId,
        hackathonId: event,
        rubricItemId: responseId,
        value: index === 0 ? "Great demo" : "Excluded feedback",
        isPublic: true,
      });
    }
    const own = await reads.hackerJudging(required(users[0]), event);
    expect(own.feedback).toEqual([
      {
        challengeId,
        challenge: "General",
        ratings: [{ label: "Technical execution", value: 4 }],
        responses: [{ label: "Feedback", value: "Great demo" }],
      },
    ]);
    expect(JSON.stringify(own)).not.toContain(judgeId);
    expect(JSON.stringify(own)).not.toContain("Never reveal");
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerScheduleEmergency: true })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    expect(
      (await reads.hackerJudging(required(users[0]), event, project)).feedback,
    ).toEqual([]);
    await client
      .update(schema.HackathonJudgingConfiguration)
      .set({ hackerScheduleEmergency: false })
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    expect(
      (await reads.hackerJudging(required(users[0]), event)).feedback,
    ).toEqual(own.feedback);
  });
  it("preserves the reserved slot and credential after a provider failure", async () => {
    await seedClaim();
    const { sendEmail } = await import("@forge/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(
      new Error("provider unavailable"),
    );
    expect(
      await claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker2@example.test",
      ),
    ).toMatchObject({ sent: false });
    const roster = await claims.projectRoster(project);
    expect(roster).toHaveLength(4);
    const invited = required(
      roster.find((member) => member.invitedUserId === users[2]),
    );
    const link = await claims.prepareClaimLink(event, invited.id);
    expect(link.token).toBeTruthy();
    expect(link.sentAt).toBeNull();
    expect(
      (await reads.hackerJudging(required(users[0]), event)).claimsOpen,
    ).toBe(false);
    expect(
      await claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker2@example.test",
      ),
    ).toMatchObject({ sent: true });
    expect((await claims.prepareClaimLink(event, invited.id)).token).toBe(
      link.token,
    );
    expect(await claims.projectRoster(project)).toHaveLength(4);
  });

  it("rejects legacy oversized projects before issuing links or linking profiles", async () => {
    const oversized = await seedProject(event, 5);
    await expect(
      claims.prepareClaimLink(event, required(oversized.members[0])),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await client.query.ProjectClaimLink.findMany()).toHaveLength(0);
    const token = "a".repeat(64);
    await client
      .insert(schema.ProjectClaimLink)
      .values({ memberId: required(oversized.members[0]), token });
    await expect(
      claims.previewProjectClaim(required(users[0]), event, token),
    ).rejects.toThrow();
    await expect(
      claims.selectProjectMember(required(users[0]), event, {
        token,
        memberId: required(oversized.members[0]),
      }),
    ).rejects.toThrow();
    await client.insert(schema.ProjectClaim).values({
      projectId: oversized.id,
      hackathonId: event,
      memberId: required(oversized.members[0]),
      userId: required(users[0]),
    });
    await expect(
      claims.inviteProjectMember(
        required(users[0]),
        event,
        "hacker2@example.test",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await claims.projectRoster(oversized.id)).toHaveLength(5);
  });

  it("hides recipient state and throttles repeated invitation attempts", async () => {
    await seedClaim();
    const failures = [];
    for (const email of [
      "unknown@example.test",
      "hacker6@example.test",
      "hacker0@example.test",
    ]) {
      try {
        await claims.inviteProjectMember(required(users[0]), event, email);
      } catch (error) {
        failures.push(error);
      }
    }
    expect(failures).toHaveLength(3);
    for (const error of failures)
      expect(error).toMatchObject({
        code: "BAD_REQUEST",
        message:
          "That email cannot be invited. Use your teammate's hacker profile email and ensure they are checked in.",
      });
    for (let index = 0; index < 7; index++)
      await expect(
        claims.inviteProjectMember(
          required(users[0]),
          event,
          "unknown@example.test",
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      claims.inviteProjectMember(
        required(users[0]),
        event,
        "unknown@example.test",
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("TC-011: first claim permanently blocks replacement, before any rooms exist", async () => {
    await seedClaim();
    const [config] = await client
      .select()
      .from(schema.HackathonJudgingConfiguration)
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, event));
    expect(config?.projectClaimsStartedAt).toBeInstanceOf(Date);
    const { importDevpostProjects } =
      await import("../../projects-import.server");
    const csv =
      "Project Title,Submission Url,Project Status,Project Created At,Project Submitted At,About The Project,Submitter First Name,Submitter Last Name,Submitter Email,Additional Team Member Count\nNew,https://devpost.com/software/new,Submitted (Gallery/Visible),2026-01-01,2026-01-02,Hello,Test,Person,new@example.test,0";
    await expect(
      importDevpostProjects({
        actor: { id: required(users[0]) },
        hackathonId: event,
        csvContent: csv,
        fileSize: csv.length,
        mode: "replace",
        confirmation: "Claim test event",
      }),
    ).rejects.toThrow("Projects have been claimed");
    const result = await importDevpostProjects({
      actor: { id: required(users[0]) },
      hackathonId: event,
      csvContent: csv,
      fileSize: csv.length,
    });
    expect(result.importedProjects).toBe(1);
    expect(
      await client
        .select()
        .from(schema.ProjectClaim)
        .where(
          and(
            eq(schema.ProjectClaim.userId, required(users[0])),
            eq(schema.ProjectClaim.hackathonId, event),
          ),
        ),
    ).toHaveLength(1);
  });
});
