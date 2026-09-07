import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, asc, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

describe.runIf(canRunDatabaseTests())(
  "judging schedule and deadline integration",
  () => {
    let disposable: DisposableDatabase;
    let client: typeof import("@forge/db/client").db;
    let schema: typeof import("@forge/db/schemas/knight-hacks");
    let officer: Session;
    let member: Session;
    const officerId = randomUUID();
    const memberId = randomUUID();
    const hackathonId = randomUUID();
    const general = randomUUID();
    const sponsor = randomUUID();
    const mlh = randomUUID();
    const projectIds = [randomUUID(), randomUUID()];
    const ratingId = randomUUID();
    const responseId = randomUUID();

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_schedule");
      vi.stubEnv("DATABASE_URL", disposable.url);
      vi.stubEnv("JUDGING_ACCESS_SECRET", randomBytes(32).toString("hex"));
      client = (await import("@forge/db/client")).db;
      schema = await import("@forge/db/schemas/knight-hacks");
      const auth = await import("@forge/db/schemas/auth");
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-07T16:00:00Z"));
      for (const [id, name, permission] of [
        [officerId, "Jordan Officer", "IS_OFFICER"],
        [memberId, "Morgan Judge", "IS_JUDGE"],
      ] as const) {
        const roleId = randomUUID();
        await client.insert(auth.User).values({
          id,
          name,
          discordUserId: id.replaceAll("-", "").slice(0, 18),
        });
        await client.insert(auth.Roles).values({
          id: roleId,
          name,
          discordRoleId: roleId.replaceAll("-", "").slice(0, 18),
          permissions: permissionBitstring(permission),
        });
        await client.insert(auth.Permissions).values({ userId: id, roleId });
      }
      officer = {
        session: { id: "schedule-officer", userAgent: "vitest" },
        user: { id: officerId, name: "Jordan Officer" },
      } as unknown as Session;
      member = {
        session: { id: "schedule-member", userAgent: "vitest" },
        user: { id: memberId, name: "Morgan Judge" },
      } as unknown as Session;
      await client.insert(schema.Hackathon).values({
        id: hackathonId,
        name: "schedule-test",
        displayName: "Judging schedule test",
        theme: "Test",
        startDate: new Date("2026-09-01T00:00:00Z"),
        endDate: new Date("2026-10-01T00:00:00Z"),
      });
      await client.insert(schema.ProjectChallenge).values([
        { id: general, hackathonId, label: "General" },
        { id: sponsor, hackathonId, label: "Sponsor" },
        { id: mlh, hackathonId, label: "MLH Challenges" },
      ]);
      for (const [index, id] of projectIds.entries()) {
        await client.insert(schema.Project).values({
          id,
          hackathonId,
          title: `Team ${index}`,
          description: "A working project",
          participantCount: 1,
          submissionUrl: `https://team-${index}.devpost.com/`,
          projectCreatedAt: new Date(),
          submittedAt: new Date(),
          prizeCategories: [
            "MLH - Best Use of Arm",
            "MLH - Best Use of Gemini",
            "Sponsor",
          ],
        });
        await client.insert(schema.ProjectMember).values({
          projectId: id,
          name: `Team ${index} Captain`,
          email: `captain-${index}@example.test`,
          displayOrder: 0,
        });
        await client.insert(schema.ProjectToChallenge).values(
          [general, sponsor, mlh].map((challengeId) => ({
            projectId: id,
            challengeId,
            hackathonId,
          })),
        );
      }
      await client.insert(schema.JudgingRubricItem).values([
        {
          id: ratingId,
          hackathonId,
          kind: "rating",
          label: "Quality",
          description: "",
          displayOrder: 0,
          required: true,
          memberVisibilityPolicy: null,
          guestVisibilityPolicy: null,
        },
        {
          id: responseId,
          hackathonId,
          kind: "short_response",
          label: "Feedback",
          description: "",
          displayOrder: 1,
          required: true,
          memberVisibilityPolicy: "public",
          guestVisibilityPolicy: "private",
        },
      ]);
      await client.insert(schema.HackathonJudgingConfiguration).values({
        hackathonId,
        state: "open",
        displayAllResultsToMembers: true,
      });
    }, 120_000);

    afterAll(async () => {
      vi.useRealTimers();
      await client.$client.end();
      await disposable.drop();
      vi.unstubAllEnvs();
    });

    async function caller(session: Session | null) {
      const trpc = await import("../../trpc");
      const { judgingRouter } = await import("../../routers/judging");
      const { projectsRouter } = await import("../../routers/projects");
      return trpc.createCallerFactory(
        trpc.createTRPCRouter({
          judging: judgingRouter,
          projects: projectsRouter,
        }),
      )({ session, headers: new Headers(), source: "schedule-integration" });
    }

    it("preserves reservations and enforces durable incomplete submissions through room downtime", async () => {
      const admin = await caller(officer);
      const judge = await caller(member);
      await expect(
        judge.judging.listScheduleAdmin({ hackathonId }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      const buildings = await admin.judging.listBuildings();
      expect(buildings.map((building) => building.name).sort()).toEqual([
        "BA",
        "ENG",
        "HEC",
        "HS",
      ]);
      const eng = buildings.find((building) => building.name === "ENG");
      const hec = buildings.find((building) => building.name === "HEC");
      if (!eng || !hec) throw new Error("Building seed missing.");
      expect(await admin.judging.createBuilding({ name: " eng " })).toEqual(
        eng,
      );
      const generalRoom = await admin.judging.createRoom({
        hackathonId,
        challengeId: general,
        name: "101",
        buildingId: eng.id,
      });
      const sponsorRoom = await admin.judging.createRoom({
        hackathonId,
        challengeId: sponsor,
        name: "101",
        buildingId: hec.id,
      });
      const mlhRoom = await admin.judging.createRoom({
        hackathonId,
        challengeId: mlh,
        name: "102",
        buildingId: eng.id,
      });
      await expect(
        admin.judging.createRoom({
          hackathonId,
          challengeId: sponsor,
          name: " 101 ",
          buildingId: eng.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await admin.judging.joinRoom({ roomId: sponsorRoom.id });
      await judge.judging.joinRoom({ roomId: generalRoom.id });
      const timing = {
        startsAt: new Date("2026-09-07T16:30:00Z"),
        endsAt: new Date("2026-09-07T17:30:00Z"),
        setupMinutes: 2,
        judgingMinutes: 6,
        teardownMinutes: 2,
        sameBuildingBreakMinutes: 10,
        differentBuildingBreakMinutes: 20,
      };
      let job = await admin.judging.generateSchedule({ hackathonId, timing });
      for (let count = 0; count < 20 && job.status === "searching"; count += 1)
        job = await admin.judging.continueScheduleGeneration({
          hackathonId,
          jobId: job.id,
        });
      expect(job.status).toBe("optimal");
      expect(job.candidate).toHaveLength(4);
      expect(
        job.candidate.every(
          (appointment) =>
            appointment.roomId !== mlhRoom.id &&
            appointment.challengeId !== mlh,
        ),
      ).toBe(true);
      await expect(
        admin.judging.saveSchedule({
          hackathonId,
          jobId: job.id,
          candidateKey: "0".repeat(64),
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const saves = await Promise.allSettled([
        admin.judging.saveSchedule({
          hackathonId,
          jobId: job.id,
          candidateKey: job.candidateKey,
        }),
        admin.judging.saveSchedule({
          hackathonId,
          jobId: job.id,
          candidateKey: job.candidateKey,
        }),
      ]);
      expect(
        saves.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      await expect(
        admin.judging.generateSchedule({ hackathonId, timing }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        admin.judging.updateRoom({
          roomId: generalRoom.id,
          name: "102",
          challengeId: general,
          buildingId: eng.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        admin.judging.archiveRoom({ roomId: generalRoom.id }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const before = await client
        .select()
        .from(schema.JudgingAppointment)
        .orderBy(asc(schema.JudgingAppointment.id));
      const selected = before.find(
        (appointment) => appointment.challengeId === general,
      );
      if (!selected) throw new Error("General appointment missing.");
      const moves = await admin.judging.getAppointmentMoveChoices({
        hackathonId,
        appointmentId: selected.id,
      });
      expect(moves.members[0]?.email).toMatch(/captain-/);
      expect(
        moves.choices.every((choice) => choice.roomId === generalRoom.id),
      ).toBe(true);
      const choice = moves.choices[0];
      if (!choice) throw new Error("Expected a future opening.");
      await admin.judging.moveAppointment({
        hackathonId,
        appointmentId: selected.id,
        expectedRevision: selected.revision,
        roomId: choice.roomId,
        startsAt: choice.startsAt,
      });
      const after = await client
        .select()
        .from(schema.JudgingAppointment)
        .orderBy(asc(schema.JudgingAppointment.id));
      expect(after.filter((row) => row.id !== selected.id)).toEqual(
        before.filter((row) => row.id !== selected.id),
      );
      await expect(
        admin.judging.moveAppointment({
          hackathonId,
          appointmentId: selected.id,
          expectedRevision: selected.revision,
          roomId: choice.roomId,
          startsAt: choice.startsAt,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const lateProjectId = randomUUID();
      await client.insert(schema.Project).values({
        id: lateProjectId,
        hackathonId,
        title: "Late import",
        description: "New project after Save",
        participantCount: 1,
        submissionUrl: "https://devpost.com/software/late-import",
        projectCreatedAt: new Date(),
        submittedAt: new Date(),
      });
      await client.insert(schema.ProjectToChallenge).values({
        projectId: lateProjectId,
        challengeId: general,
        hackathonId,
      });
      const openings = await admin.judging.getUnassignedPresentationChoices({
        hackathonId,
        projectId: lateProjectId,
        challengeId: general,
      });
      if (!openings.smartChoice)
        throw new Error("Expected an opening for the late import.");
      await admin.judging.assignPresentation({
        hackathonId,
        projectId: lateProjectId,
        challengeId: general,
        roomId: openings.smartChoice.roomId,
        startsAt: openings.smartChoice.startsAt,
      });
      expect(
        (
          await client
            .select()
            .from(schema.JudgingAppointment)
            .orderBy(asc(schema.JudgingAppointment.id))
        ).filter((row) => row.projectId !== lateProjectId),
      ).toEqual(after);
      // A typing draft is not a result and does not lock Drop, even when complete.
      const sponsorAppointments = after
        .filter((appointment) => appointment.challengeId === sponsor)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const firstSponsor = sponsorAppointments[0];
      if (!firstSponsor) throw new Error("Sponsor appointment missing.");
      vi.setSystemTime(firstSponsor.startsAt);
      const completeAnswers = {
        ratings: [{ itemId: ratingId, value: 5 }],
        responses: [
          { itemId: responseId, value: "Excellent work", isPublic: true },
        ],
      };
      await admin.judging.saveEvaluationDraft({
        hackathonId,
        challengeId: sponsor,
        projectId: firstSponsor.projectId,
        expectedDraftRevision: 0,
        expectedRevision: 0,
        ...completeAnswers,
      });
      expect(
        await admin.judging.listMySubmissions({ hackathonId }),
      ).toHaveLength(0);
      expect(
        (await admin.judging.listScheduleAdmin({ hackathonId })).schedule
          ?.firstResultAt,
      ).toBeNull();
      await admin.judging.dropSchedule({ hackathonId });
      expect(
        await client.select().from(schema.ProjectEvaluationDraft),
      ).toHaveLength(0);
      expect(await client.select().from(schema.ProjectEvaluation)).toHaveLength(
        0,
      );

      // Regenerate before the new window, then allow a closed browser's persisted
      // incomplete draft to expire without a client submit call.
      await admin.judging.heartbeat({ roomId: sponsorRoom.id });
      await judge.judging.heartbeat({ roomId: generalRoom.id });
      const secondTiming = {
        ...timing,
        startsAt: new Date("2026-09-07T17:00:00Z"),
        endsAt: new Date("2026-09-07T18:00:00Z"),
      };
      job = await admin.judging.generateSchedule({
        hackathonId,
        timing: secondTiming,
      });
      for (let count = 0; count < 20 && job.status === "searching"; count += 1)
        job = await admin.judging.continueScheduleGeneration({
          hackathonId,
          jobId: job.id,
        });
      await admin.judging.saveSchedule({
        hackathonId,
        jobId: job.id,
        candidateKey: job.candidateKey,
      });
      const current = (
        await admin.judging.listScheduleAdmin({ hackathonId })
      ).appointments
        .filter((appointment) => appointment.challengeId === sponsor)
        .at(-1);
      if (!current) throw new Error("Second sponsor appointment missing.");
      vi.setSystemTime(current.startsAt);
      const editorInput = {
        hackathonId,
        challengeId: sponsor,
        projectId: current.projectId,
      };
      expect(
        await admin.judging.getEvaluationEditor(editorInput),
      ).toMatchObject({ canEdit: true, deadlineAt: current.deadlineAt });
      await expect(
        judge.judging.getEvaluationEditor(editorInput),
      ).resolves.toMatchObject({ canEdit: false });
      await admin.judging.saveEvaluationDraft({
        ...editorInput,
        expectedDraftRevision: 0,
        expectedRevision: 0,
        ratings: [{ itemId: ratingId, value: 4 }],
        responses: [],
      });
      await expect(
        admin.judging.saveEvaluationDraft({
          ...editorInput,
          expectedDraftRevision: 0,
          expectedRevision: 0,
          ratings: [],
          responses: [],
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      vi.setSystemTime(current.deadlineAt);
      const submissions = await admin.judging.listMySubmissions({
        hackathonId,
      });
      expect(submissions).toHaveLength(1);
      expect(submissions[0]).toMatchObject({
        projectId: current.projectId,
        isComplete: false,
        score: null,
        autoSubmittedAt: current.deadlineAt,
      });
      const monitored = await admin.judging.listScheduleAdmin({ hackathonId });
      expect(monitored.schedule?.firstResultAt).toEqual(current.deadlineAt);
      expect(
        monitored.appointments.find(
          (appointment) => appointment.id === current.id,
        )?.status,
      ).toBe("incomplete");
      expect(
        monitored.appointments.some(
          (appointment) => appointment.status === "missed",
        ),
      ).toBe(true);
      await expect(
        admin.judging.dropSchedule({ hackathonId }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const beforeCompletion = await admin.judging.getProjectScores({
        hackathonId,
        challengeId: sponsor,
        projectIds: [current.projectId],
      });
      expect(beforeCompletion[0]?.overall?.count).toBe(0);
      await expect(
        admin.judging.saveEvaluation({ ...editorInput, ...completeAnswers }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      // The original room's teardown remains binding after switching to a gap.
      await admin.judging.joinRoom({ roomId: mlhRoom.id });
      expect(
        await admin.judging.getEvaluationEditor(editorInput),
      ).toMatchObject({ canEdit: false });
      vi.setSystemTime(current.endsAt);
      expect(
        await admin.judging.getEvaluationEditor(editorInput),
      ).toMatchObject({ canEdit: true });
      const completed = await admin.judging.saveEvaluation({
        ...editorInput,
        expectedRevision: 1,
        ...completeAnswers,
      });
      expect(completed).toMatchObject({
        isComplete: true,
        revision: 2,
        score: 5,
      });
      expect(completed.evaluationId).toBe(submissions[0]?.id);
      expect(
        (
          await admin.judging.listScheduleAdmin({ hackathonId })
        ).appointments.find((appointment) => appointment.id === current.id)
          ?.status,
      ).toBe("complete");
      // MLH judging is untimed in its room and contributes one overall mean.
      await admin.judging.saveEvaluation({
        ...editorInput,
        challengeId: mlh,
        ratings: [{ itemId: ratingId, value: 3 }],
        responses: completeAnswers.responses,
      });
      const scores = await admin.judging.getProjectScores({
        hackathonId,
        challengeId: sponsor,
        projectIds: [current.projectId],
      });
      expect(scores[0]?.overall).toEqual({ count: 2, value: 4 });
      expect(
        await client
          .select()
          .from(schema.ProjectEvaluation)
          .where(
            and(
              eq(schema.ProjectEvaluation.projectId, current.projectId),
              eq(schema.ProjectEvaluation.challengeId, mlh),
            ),
          ),
      ).toHaveLength(1);
    }, 30_000);
  },
);
