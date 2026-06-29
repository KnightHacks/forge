import { describe, expect, it, vi } from "vitest";

import type { TestAttendanceRecord } from "../support/events/fixtures";
import {
  createAttendanceService,
  serializeAttendanceCsv,
} from "../../utils/events/attendance";
import { createTestClock } from "../support/events/fake-clock";
import {
  attendanceRecord,
  EVENT_IDS,
  eventRecord,
  MEMBER_IDS,
  memberRecord,
  NOW,
  ROLE_IDS,
  USER_IDS,
} from "../support/events/fixtures";
import { InMemoryAttendanceState } from "../support/events/in-memory-attendance-state";

function setup({
  attendance = [],
  event = eventRecord(),
  member = memberRecord(),
}: {
  attendance?: readonly TestAttendanceRecord[];
  event?: ReturnType<typeof eventRecord>;
  member?: ReturnType<typeof memberRecord>;
} = {}) {
  const audit = vi.fn().mockResolvedValue(undefined);
  const clock = createTestClock(NOW);
  const state = new InMemoryAttendanceState({
    attendance,
    events: [event],
    members: [member],
  });
  let attendanceSequence = 0;
  const service = createAttendanceService({
    audit,
    clock: clock.now,
    idFactory: () =>
      `00000000-0000-4000-8000-${String(++attendanceSequence).padStart(12, "9")}`,
    state,
  });
  return { audit, clock, service, state };
}

describe("event check-in and attendance", () => {
  it("[TC-018] records server-derived points, time, and operator for a raw User UUID", async () => {
    const { service, state } = setup();

    const result = await service.checkIn({
      actorId: USER_IDS.operator,
      eventId: EVENT_IDS.public,
      qrPayload: USER_IDS.member,
    });

    expect(result).toMatchObject({
      pointsAwarded: 25,
      status: "checked_in",
    });
    expect([...state.attendance.values()]).toEqual([
      expect.objectContaining({
        checkedInAt: NOW,
        checkedInBy: USER_IDS.operator,
        eventId: EVENT_IDS.public,
        memberId: MEMBER_IDS.member,
        pointsAwarded: 25,
        pointsAwardedEstimated: false,
      }),
    ]);
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 35,
    });
  });

  it("[TC-019] normalizes the transitional user: QR prefix", async () => {
    const { service, state } = setup();

    await expect(
      service.checkIn({
        actorId: USER_IDS.operator,
        eventId: EVENT_IDS.public,
        qrPayload: `user:${USER_IDS.member}`,
      }),
    ).resolves.toMatchObject({ status: "checked_in" });
    expect([...state.attendance.values()][0]).toMatchObject({
      memberId: MEMBER_IDS.member,
    });
  });

  it("[TC-020] supports a minimal manual member choice without camera input", async () => {
    const { service } = setup();

    await expect(
      service.checkIn({
        actorId: USER_IDS.operator,
        eventId: EVENT_IDS.public,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "checked_in" });
  });

  it("[TC-021, TC-003] rejects unpaid dues attendance without side effects", async () => {
    const event = eventRecord({
      audience: "dues",
      id: EVENT_IDS.dues,
      synchronizedVisibility: {
        audience: "dues",
        internal: false,
        roleIds: [],
      },
    });
    const { service, state } = setup({
      event,
      member: memberRecord({ duesActive: false }),
    });

    await expect(
      service.checkIn({
        actorId: USER_IDS.operator,
        eventId: event.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toEqual({ status: "dues_required" });
    expect(state.attendance.size).toBe(0);
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 10,
    });
  });

  it("[TC-021] uses Blade role assignment OR semantics without a live Discord lookup", async () => {
    const event = eventRecord({
      audience: "roles",
      id: EVENT_IDS.role,
      roleIds: [ROLE_IDS.other, ROLE_IDS.cosmetic],
      synchronizedVisibility: {
        audience: "roles",
        internal: false,
        roleIds: [ROLE_IDS.other, ROLE_IDS.cosmetic],
      },
    });
    const eligible = setup({ event, member: memberRecord() });
    await expect(
      eligible.service.checkIn({
        actorId: USER_IDS.operator,
        eventId: event.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "checked_in" });

    const ineligible = setup({
      event,
      member: memberRecord({ roleIds: [] }),
    });
    await expect(
      ineligible.service.checkIn({
        actorId: USER_IDS.operator,
        eventId: event.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toEqual({ status: "role_required" });
    expect(ineligible.state.attendance.size).toBe(0);
  });

  it("rechecks dues and roles after acquiring the check-in lock", async () => {
    const event = eventRecord({
      audience: "dues",
      id: EVENT_IDS.dues,
      synchronizedVisibility: {
        audience: "dues",
        internal: false,
        roleIds: [],
      },
    });
    const fixture = setup({
      event,
      member: memberRecord({ duesActive: true }),
    });
    const originalLock = fixture.state.withCheckInLock.bind(fixture.state);
    vi.spyOn(fixture.state, "withCheckInLock").mockImplementation(
      (eventId, memberId, operation) => {
        const member = fixture.state.members.get(memberId);
        if (member)
          fixture.state.members.set(memberId, { ...member, duesActive: false });
        return originalLock(eventId, memberId, operation);
      },
    );

    await expect(
      fixture.service.checkIn({
        actorId: USER_IDS.operator,
        eventId: event.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toEqual({ status: "dues_required" });
    expect(fixture.state.attendance.size).toBe(0);
  });

  it("[TC-029] preserves AND eligibility for malformed Legacy dues-plus-role rows", async () => {
    const legacy = eventRecord({
      audience: "roles",
      id: EVENT_IDS.legacy,
      legacy: true,
      legacyDuesRequired: true,
      publishedAt: null,
      roleIds: [ROLE_IDS.cosmetic],
      synchronizedVisibility: null,
    });
    const unpaid = setup({
      event: legacy,
      member: memberRecord({ duesActive: false }),
    });
    await expect(
      unpaid.service.checkIn({
        actorId: USER_IDS.operator,
        eventId: legacy.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toEqual({ status: "dues_required" });

    const paidWithoutRole = setup({
      event: legacy,
      member: memberRecord({ duesActive: true, roleIds: [] }),
    });
    await expect(
      paidWithoutRole.service.checkIn({
        actorId: USER_IDS.operator,
        eventId: legacy.id,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toEqual({ status: "role_required" });
  });

  it("[TC-022] serializes concurrent duplicate scans into one award", async () => {
    const { service, state } = setup();

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.checkIn({
          actorId: USER_IDS.operator,
          eventId: EVENT_IDS.public,
          memberId: MEMBER_IDS.member,
        }),
      ),
    );

    expect(
      outcomes.filter(({ status }) => status === "checked_in"),
    ).toHaveLength(1);
    expect(
      outcomes.filter(({ status }) => status === "already_checked_in"),
    ).toHaveLength(4);
    expect(state.attendance.size).toBe(1);
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 35,
    });
  });

  it("[TC-023] serializes only approved attendance fields and neutralizes spreadsheet formulas", () => {
    const csv = serializeAttendanceCsv([
      {
        checkedInAt: NOW,
        discordUsername: "+cmd|' /C calc'!A0",
        memberId: MEMBER_IDS.member,
        name: '=HYPERLINK("https://evil.test","Member, One")\nNext line',
        operatorId: USER_IDS.operator,
        operatorName: "@operator",
        pointsAwarded: 25,
        pointsAwardedEstimated: false,
      },
      {
        checkedInAt: null,
        discordUsername: "legacy",
        memberId: MEMBER_IDS.other,
        name: "\t =2+2",
        operatorId: null,
        operatorName: null,
        pointsAwarded: null,
        pointsAwardedEstimated: true,
      },
    ]);

    expect(csv.split("\n")[0]).toBe(
      "Member UUID,Name,Discord Username,Checked In At,Operator UUID,Operator,Points Awarded,Estimated",
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@operator");
    expect(csv).toContain("'\t =2+2");
    expect(csv).toContain(",,Yes");
    expect(csv).not.toContain("Email");
    expect(csv).not.toContain("Phone");
  });

  it("[TC-024] removes attendance using captured points rather than current Event points", async () => {
    const row = attendanceRecord({ pointsAwarded: 25 });
    const { service, state } = setup({
      attendance: [row],
      event: eventRecord({ points: 100 }),
      member: memberRecord({ points: 35 }),
    });

    await expect(
      service.removeAttendance({
        actorId: USER_IDS.operator,
        attendanceId: row.id,
        acknowledgeEstimated: false,
      }),
    ).resolves.toMatchObject({ pointsRemoved: 25, status: "removed" });
    expect(state.attendance.size).toBe(0);
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 10,
    });
  });

  it("does not report or audit success when concurrent removal already won", async () => {
    const row = attendanceRecord({ pointsAwarded: 25 });
    const fixture = setup({ attendance: [row] });
    vi.spyOn(
      fixture.state,
      "removeAttendanceAndDecrementPoints",
    ).mockResolvedValue(false);

    await expect(
      fixture.service.removeAttendance({
        actorId: USER_IDS.operator,
        attendanceId: row.id,
        acknowledgeEstimated: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fixture.audit).not.toHaveBeenCalled();
  });

  it("[TC-024, TC-NEG-009] requires acknowledgement for estimates and blocks null awards", async () => {
    const estimated = attendanceRecord({
      pointsAwarded: 35,
      pointsAwardedEstimated: true,
    });
    const fixture = setup({
      attendance: [estimated],
      member: memberRecord({ points: 45 }),
    });

    await expect(
      fixture.service.removeAttendance({
        actorId: USER_IDS.operator,
        attendanceId: estimated.id,
        acknowledgeEstimated: false,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fixture.state.attendance.size).toBe(1);

    await expect(
      fixture.service.removeAttendance({
        actorId: USER_IDS.operator,
        attendanceId: estimated.id,
        acknowledgeEstimated: true,
      }),
    ).resolves.toMatchObject({ pointsRemoved: 35, status: "removed" });

    const unknown = attendanceRecord({ pointsAwarded: null });
    const unknownFixture = setup({ attendance: [unknown] });
    await expect(
      unknownFixture.service.removeAttendance({
        actorId: USER_IDS.operator,
        attendanceId: unknown.id,
        acknowledgeEstimated: true,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(unknownFixture.state.attendance.size).toBe(1);
  });

  it("[TC-NEG-002] treats hackathon events as not found during check-in", async () => {
    const event = eventRecord({
      hackathonId: "00000000-0000-4000-8000-000000000701",
      id: EVENT_IDS.hackathon,
    });
    const { service, state } = setup({ event });

    await expect(
      service.checkIn({
        actorId: USER_IDS.operator,
        eventId: event.id,
        memberId: MEMBER_IDS.member,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.attendance.size).toBe(0);
  });

  it("[TC-NEG-007] ignores forged point/eligibility fields and derives the award server-side", async () => {
    const { service, state } = setup();
    const forgedInput = {
      actorId: USER_IDS.operator,
      duesActive: true,
      eventId: EVENT_IDS.public,
      memberId: MEMBER_IDS.member,
      points: 999,
      roleIds: [ROLE_IDS.other],
    };

    await service.checkIn(forgedInput);

    expect([...state.attendance.values()][0]).toMatchObject({
      pointsAwarded: 25,
    });
  });

  it.each([
    ["arbitrary text", "invalid_qr"],
    ["user:not-a-uuid", "invalid_qr"],
    [`member:${USER_IDS.member}`, "invalid_qr"],
    ["00000000-0000-4000-8000-000000009999", "member_not_found"],
  ] as const)(
    "[TC-NEG-008] rejects QR value %s with %s and no mutation",
    async (qrPayload, status) => {
      const { service, state } = setup();

      await expect(
        service.checkIn({
          actorId: USER_IDS.operator,
          eventId: EVENT_IDS.public,
          qrPayload,
        }),
      ).resolves.toEqual({ status });
      expect(state.attendance.size).toBe(0);
      expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
        points: 10,
      });
    },
  );

  it("[TC-NEG-012] commits check-in even when non-PII audit delivery fails", async () => {
    const { audit, service, state } = setup();
    audit.mockRejectedValue(new Error("audit unavailable"));

    await expect(
      service.checkIn({
        actorId: USER_IDS.operator,
        eventId: EVENT_IDS.public,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "checked_in" });
    expect(state.attendance.size).toBe(1);
    expect(JSON.stringify(audit.mock.calls)).not.toContain(
      "member@example.test",
    );
    expect(JSON.stringify(audit.mock.calls)).not.toContain("Member One");
  });
});
