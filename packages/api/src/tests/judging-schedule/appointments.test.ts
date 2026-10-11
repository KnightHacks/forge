import { describe, expect, it } from "vitest";

import {
  appointmentStatus,
  evaluationsForAppointment,
} from "../../utils/judging-schedule/appointments";

describe("hacker appointment status", () => {
  const appointment = {
    id: "appointment-current",
    challengeId: "challenge-parent",
    startsAt: new Date("2099-01-01T13:00:00Z"),
    endsAt: new Date("2099-01-01T13:15:00Z"),
  };

  it("uses an incomplete evaluation linked to the appointment", () => {
    const evaluations = evaluationsForAppointment(appointment, [
      {
        appointmentId: appointment.id,
        challengeId: "challenge-child",
        isComplete: false,
      },
    ]);

    expect(appointmentStatus(appointment, evaluations, new Date(0))).toBe(
      "incomplete",
    );
  });

  it("does not apply an evaluation from a previous appointment", () => {
    const evaluations = evaluationsForAppointment(appointment, [
      {
        appointmentId: "appointment-previous",
        challengeId: appointment.challengeId,
        isComplete: false,
      },
    ]);

    expect(appointmentStatus(appointment, evaluations, new Date(0))).toBe(
      "future",
    );
  });

  it("keeps challenge matching for legacy evaluations without an appointment", () => {
    const evaluations = evaluationsForAppointment(appointment, [
      {
        appointmentId: null,
        challengeId: appointment.challengeId,
        isComplete: false,
      },
    ]);

    expect(appointmentStatus(appointment, evaluations, new Date(0))).toBe(
      "incomplete",
    );
  });
});
